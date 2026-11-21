import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { cappingService } from '../../campaigns/capping.service.js';
import { DCB_OUTCOMES } from '../helpers/universe-dcb-normalizer.js';
import { HELD_OTP_MESSAGE } from '../../otp/helpers/payout.js';
import { resolveApprovalHold } from '../../otp/helpers/approval-control.js';
import {
  httpError,
  pickDcbExposeRequestId,
  correlationKey,
  requestCorrelationKey,
  clearCorrelation,
  acquireConfirmLock,
  releaseConfirmLock,
} from './dcb-expose-session.js';
import { logVisitEvent, runExpose } from './dcb-expose-inbound.service.js';
import {
  callProvider,
  loadExposeContext,
  providerInput,
} from './dcb-expose-context.service.js';

const getVisitRepo = () => getRepository(Visit);

export const executeExposeConfirm = async ({
  input = {},
  clientIp,
  meta = {},
  provider,
  callLogger,
} = {}) => {
  const safeInput = input || {};
  return runExpose(
    'confirm',
    safeInput,
    clientIp,
    meta,
    async (existingVisit) => {
      const pin = String(
        safeInput.pin ||
          safeInput.pincode ||
          safeInput.pinCode ||
          safeInput.otp ||
          '',
      ).trim();
      if (!pin) throw httpError('PIN is required', 400, 'PIN_REQUIRED');
      const requestId = pickDcbExposeRequestId(safeInput);
      if (!requestId) {
        throw httpError(
          'requestId is required. Use the requestId returned from pincode.',
          400,
          'REQUEST_ID_REQUIRED',
        );
      }

      const ctx = await loadExposeContext({
        ...safeInput,
        requestId,
        clientIp,
        requestUrl: meta.requestUrl,
        existingVisit,
      });
      const correlation = ctx.correlation;
      if (!correlation?.providerRequestId) {
        throw httpError(
          'requestId is missing or expired. Call pincode first and send the returned requestId.',
          409,
          'DCB_CORRELATION_REQUIRED',
        );
      }
      if (
        ctx.purchaseTypeId &&
        correlation.purchaseTypeId &&
        String(correlation.purchaseTypeId) !== ctx.purchaseTypeId
      ) {
        throw httpError(
          'PIN request does not match the selected purchase type',
          409,
          'DCB_CORRELATION_MISMATCH',
        );
      }

      const pendingKey = correlationKey(ctx.campaign.id, ctx.visitId, ctx.msisdn);
      const reqKey = requestCorrelationKey(
        ctx.campaign.id,
        ctx.vendor.id,
        correlation.providerRequestId,
      );
      const lockKey = `${reqKey}:confirm`;
      const lockAcquired = await acquireConfirmLock(lockKey);
      if (!lockAcquired) {
        throw httpError(
          'PIN confirmation is already in progress',
          409,
          'DCB_CONFIRM_IN_PROGRESS',
        );
      }

      try {
        const { providerLog } = await callProvider({
          ctx: {
            ...ctx,
            purchaseTypeId: String(correlation.purchaseTypeId || ctx.purchaseTypeId || ''),
          },
          callType: ApiCallType.DCB_CONFIRM,
          action: 'confirm',
          execute: () =>
            provider.confirm(ctx.config, {
              ...providerInput(ctx),
              purchaseTypeId: correlation.purchaseTypeId || ctx.purchaseTypeId,
              providerRequestId: correlation.providerRequestId,
              pin,
            }),
          statusLabel: 'POLLING',
        });
        await clearCorrelation([pendingKey, reqKey]);

        const trackingPayout =
          ctx.tracking?.payoutPercent != null && ctx.tracking.payoutPercent !== ''
            ? ctx.tracking.payoutPercent
            : 100;
        const decision = await resolveApprovalHold({
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          payoutPercent: trackingPayout,
          decisionKey: String(ctx.visitId),
        });

        await getVisitRepo().update(
          { id: ctx.visitId },
          { otpVerifiedAt: new Date(), visitStatus: VisitStatus.SUCCESS },
        );

        await logVisitEvent(ctx.visitId, VisitEventType.OTP_VERIFY, {
          source: 'dcb_expose',
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          msisdn: ctx.msisdn,
          requestId: correlation.providerRequestId,
          success: true,
          held: decision.held,
          payoutPercent: decision.payoutPercent,
          seq: decision.seq,
          clientResponse: decision.held ? 'invalid_otp' : undefined,
        });

        if (decision.held) {
          const err = new Error(HELD_OTP_MESSAGE);
          err.statusCode = 400;
          err.code = 'DCB_HELD';
          err.held = true;
          err.providerLog = providerLog;
          throw err;
        }

        await cappingService
          .incrementCampaignConversionCount(
            ctx.campaign.id,
            ctx.campaign.cappingInterval,
            ctx.vendor.id,
          )
          .catch(() => {});

        const payload = {
          verified: true,
          requestId: correlation.providerRequestId,
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          visitId: ctx.visitId,
          msisdn: ctx.msisdn,
          serviceId: ctx.serviceId,
          outcome: DCB_OUTCOMES.PENDING,
          stage: 'POLLING',
          message:
            'PIN confirmed. Poll status until the subscription is entitled.',
        };
        return {
          visit: ctx.visit,
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          msisdn: ctx.msisdn,
          payload,
          providerLog,
        };
      } finally {
        await releaseConfirmLock(lockKey);
      }
    },
    callLogger,
  );
};
