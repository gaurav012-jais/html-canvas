import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { universeDcbProvider } from '../universe-dcb.provider.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { flowEngineService } from '../core/engine.js';
import {
  DCB_OUTCOMES,
  getNestedValue,
  normalizeUniverseDcbResponse,
} from '../helpers/universe-dcb-normalizer.js';
import { buildDcbExposeHtmlScreen } from '../helpers/dcb-expose-screen.js';
import {
  mergePurchaseTypeMappings,
  toVendorPurchaseTypes,
} from '../helpers/universe-dcb-purchase-types.js';
import {
  httpError,
  parseConfig,
  correlationKey,
  requestCorrelationKey,
  saveCorrelation,
  resolveAssignedVendor,
} from './dcb-expose-session.js';
import { logVisitEvent, runExpose } from './dcb-expose-inbound.service.js';
import {
  assertDcbApiExpose,
  callProvider,
  loadExposeContext,
  providerInput,
} from './dcb-expose-context.service.js';
import { executeExposeConfirm } from './dcb-expose-confirm.service.js';

const getCampaignRepo = () => getRepository(Campaign);
const getApiConfigRepo = () => getRepository(ApiConfig);

export const createUniverseDcbExposeOperations = (
  provider = universeDcbProvider,
  callLogger = apiCallLogService,
) => {
  const exposeConfig = async (input = {}, clientIp, meta = {}) =>
    runExpose('config', input, clientIp, meta, async () => {
      const safeInput = input || {};
      const cId = parseInt(safeInput.campaignId, 10);
      if (!cId) throw httpError('campaignId is required', 400, 'CAMPAIGN_REQUIRED');
      const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
      assertDcbApiExpose(campaign);
      const { vendor } = await resolveAssignedVendor(campaign, safeInput.vendorId);

      const apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: cId },
      });
      const config = parseConfig(apiConfig?.dcbConfigJson);
      const ctx = {
        campaign,
        vendor,
        config,
        visit: null,
        visitId: null,
        msisdn: null,
        serviceId: String(config.serviceId || campaign.serviceId || '').trim(),
        purchaseTypeId: '',
        transactionChannel: '',
        source: 'dcb_expose',
      };

      const { response, providerLog } = await callProvider({
        ctx,
        callType: ApiCallType.DCB_CONFIG,
        action: 'config',
        execute: () => provider.getPublicConfig(ctx.config, {}),
        statusLabel: 'SUCCESS',
      });
      const envelopePath = ctx.config.responsePaths?.envelope;
      const providerConfig = envelopePath
        ? getNestedValue(response.data, envelopePath)
        : response.data;
      if (!Array.isArray(providerConfig?.purchaseTypes)) {
        const err = httpError(
          'Universe DCB public configuration is malformed',
          502,
          'DCB_PUBLIC_CONFIG_INVALID',
        );
        err.providerLog = providerLog;
        throw err;
      }

      const purchaseTypes = toVendorPurchaseTypes(
        mergePurchaseTypeMappings(
          ctx.config.purchaseTypeMappings,
          providerConfig.purchaseTypes,
        ),
      );
      const payload = {
        campaignId: ctx.campaign.id,
        vendorId: vendor.id,
        purchaseTypes,
        pollIntervalMs: Math.max(250, Number(ctx.config.pollIntervalMs) || 2000),
        pollTimeoutMs: Math.max(1000, Number(ctx.config.pollTimeoutMs) || 60000),
      };
      return {
        visit: null,
        campaignId: ctx.campaign.id,
        vendorId: vendor.id,
        msisdn: null,
        payload,
        providerLog,
      };
    }, callLogger);

  const exposePincode = async (input = {}, clientIp, meta = {}) =>
    runExpose('pincode', input, clientIp, meta, async (existingVisit) => {
      const safeInput = input || {};
      const ctx = await loadExposeContext({
        ...safeInput,
        clientIp,
        requestUrl: meta?.requestUrl,
        existingVisit,
      });
      if (!ctx.purchaseTypeId) {
        throw httpError(
          'purchaseTypeId or pack is required. GET /config for allowed packs.',
          400,
          'PURCHASE_TYPE_REQUIRED',
        );
      }

      const { response, providerLog } = await callProvider({
        ctx,
        callType: ApiCallType.DCB_PINCODE,
        action: 'pincode',
        execute: () => provider.requestPincode(ctx.config, providerInput(ctx)),
        statusLabel: 'PIN_REQUIRED',
      });
      if (!response.providerRequestId) {
        const err = httpError(
          'Universe DCB pincode response did not include a request ID',
          502,
          'DCB_PROVIDER_REQUEST_ID_MISSING',
        );
        err.providerLog = providerLog;
        throw err;
      }
      await saveCorrelation(
        [
          correlationKey(ctx.campaign.id, ctx.visitId, ctx.msisdn),
          requestCorrelationKey(
            ctx.campaign.id,
            ctx.vendor.id,
            response.providerRequestId,
          ),
        ],
        {
          providerRequestId: response.providerRequestId,
          purchaseTypeId: ctx.purchaseTypeId,
          campaignId: ctx.campaign.id,
          vendorId: ctx.vendor.id,
          visitId: ctx.visitId,
          msisdn: ctx.msisdn,
          serviceId: ctx.serviceId,
          transactionChannel: ctx.transactionChannel,
        },
        ctx.config.correlationTtlSeconds,
      );

      await logVisitEvent(ctx.visitId, VisitEventType.OTP_SEND, {
        source: 'dcb_expose',
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        msisdn: ctx.msisdn,
        purchaseTypeId: ctx.purchaseTypeId,
        requestId: response.providerRequestId,
        success: true,
      });

      const payload = {
        sent: true,
        requestId: response.providerRequestId,
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        visitId: ctx.visitId,
        msisdn: ctx.msisdn,
        serviceId: ctx.serviceId,
        purchaseTypeId: ctx.purchaseTypeId,
        outcome: DCB_OUTCOMES.PENDING,
        stage: 'PIN_REQUIRED',
        message: 'PIN requested successfully',
      };
      return {
        visit: ctx.visit,
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        msisdn: ctx.msisdn,
        payload,
        providerLog,
      };
    }, callLogger);

  const exposeConfirm = async (input = {}, clientIp, meta = {}) =>
    executeExposeConfirm({
      input,
      clientIp,
      meta,
      provider,
      callLogger,
    });

  const exposeStatus = async (input = {}, clientIp, meta = {}) =>
    runExpose('status', input, clientIp, meta, async (existingVisit) => {
      const safeInput = input || {};
      const ctx = await loadExposeContext({
        ...safeInput,
        clientIp,
        requestUrl: meta?.requestUrl,
        transactionChannel: safeInput.transactionChannel || 'Wifi',
        existingVisit,
      });
      const { response, providerLog } = await callProvider({
        ctx,
        callType: ApiCallType.DCB_SUBSCRIPTIONS,
        action: 'status',
        execute: () => provider.getSubscriptions(ctx.config, providerInput(ctx)),
        statusLabel: (providerResponse) =>
          normalizeUniverseDcbResponse(providerResponse.data, ctx.config, {
            serviceId: ctx.serviceId,
          }).outcome,
      });
      const result = normalizeUniverseDcbResponse(response.data, ctx.config, {
        serviceId: ctx.serviceId,
      });
      const payload = {
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        visitId: ctx.visitId,
        msisdn: ctx.msisdn,
        serviceId: ctx.serviceId,
        ...result,
      };
      return {
        visit: ctx.visit,
        campaignId: ctx.campaign.id,
        vendorId: ctx.vendor.id,
        msisdn: ctx.msisdn,
        payload,
        providerLog,
      };
    }, callLogger);

  const exposeScreen = async ({ campaignId, vendorId, origin, absolute = false } = {}) => {
    const cId = parseInt(campaignId, 10);
    if (!cId) throw httpError('campaignId is required', 400, 'CAMPAIGN_REQUIRED');
    const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
    if (!campaign) throw httpError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    const mode = flowEngineService.normalizeMode(campaign.verificationMode);
    const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (mode !== 'UNIVERSE_DCB' || !flowEngineService.isApiExposeFlow(flowConfig)) {
      throw httpError(
        'This campaign does not expose DCB billing APIs. Set Universe Telecom DCB → API expose in Subscription flow.',
        400,
        'DCB_EXPOSE_REQUIRED',
      );
    }
    const { vendor } = await resolveAssignedVendor(campaign, vendorId);
    return buildDcbExposeHtmlScreen({
      origin,
      campaignId: campaign.id,
      vendorId: vendor.id,
      absolute: Boolean(absolute),
    });
  };

  return {
    exposeConfig,
    exposePincode,
    exposeConfirm,
    exposeStatus,
    exposeScreen,
  };
};
