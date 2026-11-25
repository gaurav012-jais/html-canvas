import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { orangeBfProvider } from '../orange-bf.provider.js';
import { ORANGE_BF_OUTCOMES } from '../helpers/orange-bf-normalizer.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { scheduleDelayedChecksub } from '../checksub-worker/checksub-scheduler.js';
import {
  cleanPhone,
  safeParseJson,
  getCampaign,
  getApiConfig,
  parseProviderConfig,
  queueOrangeBfPostback,
} from './orange-bf-helpers.js';

export const verifyOtp = async ({
  phone,
  otp,
  campaignId,
  visitId,
  vendorId,
} = {}) => {
  const msisdn = cleanPhone(phone);
  if (!msisdn || !otp) {
    return { success: false, error: 'Phone and OTP are required' };
  }

  let resolvedVendorId = vendorId ? parseInt(vendorId, 10) : null;
  if (!resolvedVendorId && visitId) {
    try {
      const v = await getRepository(Visit).findOne({
        where: { id: parseInt(visitId, 10) },
        select: ['id', 'vendorId'],
      });
      if (v?.vendorId) resolvedVendorId = v.vendorId;
    } catch {
      /* best-effort visit lookup */
    }
  }

  const campaign = await getCampaign(campaignId);
  const apiConfig = await getApiConfig(campaignId);
  const config = parseProviderConfig(apiConfig);

  // Retrieve cached session chaining values
  let cachedData = {};
  if (visitId) {
    try {
      const raw = await redisService.get(`orange_bf:${visitId}`);
      if (raw) cachedData = safeParseJson(raw);
    } catch {
      /* Redis cache optional */
    }
  }
  if (!cachedData.transactionId && campaign?.id && msisdn) {
    try {
      const raw = await redisService.get(`orange_bf:${campaign.id}:${msisdn}`);
      if (raw) cachedData = safeParseJson(raw);
    } catch {
      /* Redis cache optional */
    }
  }

  const context = {
    campaignId: campaign?.id ? String(campaign.id) : '',
    campaignName: campaign?.name || '',
    visitId: visitId ? String(visitId) : '',
    vendorId: resolvedVendorId ? String(resolvedVendorId) : '',
    ...cachedData,
  };

  const verifyResult = await orangeBfProvider.validateAuthOtp({
    msisdn,
    otp: String(otp).trim(),
    transactionId: cachedData.transactionId || '',
    requestId: cachedData.requestId || cachedData.transactionId || '',
    referenceId: cachedData.referenceId || cachedData.transactionId || '',
    token: cachedData.token || '',
    sessionId: cachedData.sessionId || '',
    context,
    config,
  });

  await apiCallLogService.record({
    visitId: visitId ? parseInt(visitId, 10) : null,
    campaignId: campaign?.id || null,
    vendorId: resolvedVendorId,
    msisdn,
    callType: ApiCallType.ORANGE_BF_OTP_VERIFY || 'orange_bf_otp_verify',
    requestUrl: verifyResult.requestUrl,
    requestBody: verifyResult.requestBody
      ? typeof verifyResult.requestBody === 'string'
        ? verifyResult.requestBody
        : JSON.stringify(verifyResult.requestBody)
      : JSON.stringify(
          verifyResult.requestParams || { msisdn, otp: String(otp).trim() },
        ),
    responseStatus: verifyResult.httpStatus,
    responseBody: verifyResult.rawResponse,
    success: verifyResult.success,
    errorMessage: verifyResult.success ? null : verifyResult.responseMessage,
    statusLabel: verifyResult.outcome,
  });

  if (!verifyResult.success) {
    if (visitId) {
      try {
        await analyticsService.logEvent(
          parseInt(visitId, 10),
          VisitEventType.OTP_VERIFY,
          {
            source: 'orange_bf',
            phone: msisdn,
            success: false,
            responseCode: verifyResult.responseCode ?? null,
            error: verifyResult.responseMessage || 'OTP validation failed',
          },
        );
      } catch {
        /* best-effort OTP verify analytics log */
      }
    }
    return {
      success: false,
      status: verifyResult.outcome,
      responseCode: verifyResult.responseCode,
      error: verifyResult.responseMessage || 'OTP validation failed',
      transactionId:
        verifyResult.transactionId || cachedData.transactionId || null,
    };
  }

  // Trigger Subscription Engine Sync on OTP verify success if enabled
  let syncResult = null;
  const isSyncEnabled =
    config.syncEnabled !== false &&
    config.syncEnabled !== 'false' &&
    config.syncEnabled !== 0 &&
    config.syncEnabled !== '0';

  if (isSyncEnabled) {
    try {
      syncResult = await orangeBfProvider.syncSubscription({
        msisdn,
        subServiceId: config.syncSubServiceId || config.subServiceId,
        serviceId: config.syncServiceId || config.serviceId,
        cpId: config.syncCpId || config.cpId,
        channel: config.syncChannel || config.channel,
        country: config.syncCountry || config.country,
        operator: config.syncOperator || config.operator,
        reqType: config.syncReqType != null ? config.syncReqType : 1,
        context,
        config,
      });

      await apiCallLogService.record({
        visitId: visitId ? parseInt(visitId, 10) : null,
        campaignId: campaign?.id || null,
        vendorId: resolvedVendorId,
        msisdn,
        callType: ApiCallType.ORANGE_BF_SYNC || 'orange_bf_sync',
        requestUrl: syncResult.requestUrl,
        requestBody: syncResult.requestBody
          ? typeof syncResult.requestBody === 'string'
            ? syncResult.requestBody
            : JSON.stringify(syncResult.requestBody)
          : syncResult.requestParams
            ? JSON.stringify(syncResult.requestParams)
            : null,
        responseStatus: syncResult.httpStatus,
        responseBody: syncResult.rawResponse,
        success: syncResult.success,
        errorMessage: syncResult.success
          ? null
          : syncResult.responseMessage || 'Subscription sync failed',
        statusLabel:
          syncResult.outcome || (syncResult.success ? 'SUCCESS' : 'FAILED'),
      });

      if (visitId) {
        try {
          await analyticsService.logEvent(
            parseInt(visitId, 10),
            VisitEventType.ORANGE_BF_SYNC || 'ORANGE_BF_SYNC',
            {
              source: 'orange_bf',
              success: syncResult.success,
              responseCode: syncResult.responseCode,
              httpStatus: syncResult.httpStatus,
              serviceId: config.syncServiceId || config.serviceId,
              subServiceId: config.syncSubServiceId || config.subServiceId,
            },
          );
        } catch {
          /* best-effort sync analytics log */
        }
      }
    } catch (syncErr) {
      console.warn(
        '[OrangeBf] Failed to trigger subscription sync:',
        syncErr.message,
      );
      try {
        await apiCallLogService.record({
          visitId: visitId ? parseInt(visitId, 10) : null,
          campaignId: campaign?.id || null,
          vendorId: resolvedVendorId,
          msisdn,
          callType: ApiCallType.ORANGE_BF_SYNC || 'orange_bf_sync',
          requestUrl:
            config.syncUrl ||
            `${(config.baseUrl || '').replace(/\/$/, '')}/Subs_Engine/subscription/sync`,
          responseStatus: null,
          success: false,
          errorMessage: syncErr.message,
          statusLabel: 'ERROR',
        });
      } catch {
        /* best-effort API call error log */
      }
    }
  }

  // Orange BF has no operator billing callback. Fire vendor CPA on OTP
  // success, subject to the campaign-tracking payout % (same lattice as OTP expose).
  let postbackStatus = null;
  let payoutHeld = false;
  let payoutPercent = null;
  let queuedPostbackId = null;
  if (campaign) {
    try {
      const queued = await queueOrangeBfPostback({
        campaign,
        visitId,
        vendorId: resolvedVendorId,
        msisdn,
      });
      postbackStatus = queued.status;
      payoutHeld = Boolean(queued.held);
      payoutPercent = queued.payoutPercent ?? null;
      queuedPostbackId = queued.id || null;
    } catch (e) {
      console.warn('[OrangeBf] Failed to queue postback:', e.message);
    }
  }

  // Schedule 30-min delayed checksub — no operator billing callback in Orange BF,
  // so we verify subscription status after the provisioning window.
  try {
    await scheduleDelayedChecksub({
      postbackId: queuedPostbackId,
      msisdn,
      campaignId:
        campaign?.id || (campaignId ? parseInt(campaignId, 10) : null),
      delayMinutes: 30,
    });
  } catch (schedErr) {
    console.warn(
      '[OrangeBf] Failed to schedule delayed checksub:',
      schedErr.message,
    );
  }

  if (visitId) {
    try {
      await analyticsService.logEvent(
        parseInt(visitId, 10),
        VisitEventType.OTP_VERIFY,
        {
          source: 'orange_bf',
          phone: msisdn,
          success: true,
          held: payoutHeld,
          payoutPercent,
          postbackStatus,
        },
      );
    } catch {
      // Session Detail still has api_call_logs
    }
  }

  const forwardUrl = campaign?.successUrl || campaign?.landingUrl || null;

  return {
    success: true,
    status: ORANGE_BF_OUTCOMES.SUCCESS,
    responseCode: verifyResult.responseCode,
    transactionId:
      verifyResult.transactionId || cachedData.transactionId || null,
    forwardUrl,
    postbackStatus,
    payoutHeld,
    payoutPercent,
    message: 'OTP validated successfully',
  };
};
