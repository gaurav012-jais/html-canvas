import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { orangeBfProvider } from '../orange-bf.provider.js';
import { ORANGE_BF_OUTCOMES } from '../helpers/orange-bf-normalizer.js';
import { interpretChecksubResponse } from '../routing/checksub-rules.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import {
  cleanPhone,
  getCampaign,
  getApiConfig,
  parseProviderConfig,
} from './orange-bf-helpers.js';

export const startOrCheckSub = async ({
  phone,
  campaignId,
  visitId,
  vendorId,
  language = '_E',
} = {}) => {
  const msisdn = cleanPhone(phone);
  if (!msisdn) {
    return { success: false, error: 'MSISDN is required' };
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
  const context = {
    campaignId: campaign?.id ? String(campaign.id) : '',
    campaignName: campaign?.name || '',
    visitId: visitId ? String(visitId) : '',
    vendorId: resolvedVendorId ? String(resolvedVendorId) : '',
  };

  // 1. Run CheckSub first to see if user is already an active subscriber
  const checkResult = await orangeBfProvider.checkSubscription({
    msisdn,
    serviceId: config.serviceId,
    subServiceId: config.subServiceId,
    cpId: config.cpId,
    channel: config.channel,
    country: config.country,
    operator: config.operator,
    context,
    config,
  });

  await apiCallLogService.record({
    visitId: visitId ? parseInt(visitId, 10) : null,
    campaignId: campaign?.id || null,
    vendorId: resolvedVendorId,
    msisdn,
    callType: ApiCallType.ORANGE_BF_CHECKSUB || 'orange_bf_checksub',
    requestUrl: checkResult.requestUrl,
    requestBody: checkResult.requestBody
      ? typeof checkResult.requestBody === 'string'
        ? checkResult.requestBody
        : JSON.stringify(checkResult.requestBody)
      : JSON.stringify(
          checkResult.requestParams || {
            msisdn,
            serviceId: config.serviceId,
          },
        ),
    responseStatus: checkResult.httpStatus,
    responseBody: checkResult.rawResponse,
    success: checkResult.success,
    errorMessage: checkResult.success ? null : checkResult.responseMessage,
    statusLabel: checkResult.outcome,
  });

  // Check if user configured custom Checksub Rules in the modal UI!
  const customRules = interpretChecksubResponse(
    checkResult.rawResponse,
    apiConfig?.checksubConfigJson,
  );

  let isSubscriberActive =
    checkResult.outcome === ORANGE_BF_OUTCOMES.ACTIVE;
  let forwardUrl = campaign?.successUrl || campaign?.landingUrl || null;

  if (customRules?.matched) {
    if (customRules.go === 'external' && customRules.url) {
      forwardUrl = customRules.url;
      isSubscriberActive = true;
    } else if (customRules.go === 'page') {
      isSubscriberActive = true;
    }
  }

  // If already active subscriber -> Auto-forward to successUrl / Content Portal!
  if (isSubscriberActive) {
    return {
      success: true,
      status: ORANGE_BF_OUTCOMES.ACTIVE,
      isSubscribed: true,
      forwardUrl,
      transactionId: checkResult.transactionId,
      message: 'Subscriber is already active. Redirecting to service...',
    };
  }

  // 2. Inactive / Not found -> Generate Auth OTP via SMS
  const otpResult = await orangeBfProvider.generateAuthOtp({
    msisdn,
    language: language || config.language || '_E',
    serviceId: config.serviceId,
    subServiceId: config.subServiceId,
    cpId: config.cpId,
    channel: config.channel,
    country: config.country,
    operator: config.operator,
    context,
    config,
  });

  await apiCallLogService.record({
    visitId: visitId ? parseInt(visitId, 10) : null,
    campaignId: campaign?.id || null,
    vendorId: resolvedVendorId,
    msisdn,
    callType: ApiCallType.ORANGE_BF_OTP_SEND || 'orange_bf_otp_send',
    requestUrl: otpResult.requestUrl,
    requestBody: otpResult.requestBody
      ? typeof otpResult.requestBody === 'string'
        ? otpResult.requestBody
        : JSON.stringify(otpResult.requestBody)
      : JSON.stringify(
          otpResult.requestParams || {
            msisdn,
            language: language || config.language || '_E',
          },
        ),
    responseStatus: otpResult.httpStatus,
    responseBody: otpResult.rawResponse,
    success: otpResult.success,
    errorMessage: otpResult.success ? null : otpResult.responseMessage,
    statusLabel: otpResult.outcome,
  });

  if (!otpResult.success) {
    if (visitId) {
      try {
        await analyticsService.logEvent(
          parseInt(visitId, 10),
          VisitEventType.OTP_SEND,
          {
            source: 'orange_bf',
            phone: msisdn,
            success: false,
            responseCode: otpResult.responseCode ?? null,
            transactionId: otpResult.transactionId || null,
            error: otpResult.responseMessage || 'Failed to send OTP',
          },
        );
      } catch {
        /* best-effort OTP send analytics log */
      }
    }
    return {
      success: false,
      status: otpResult.outcome,
      responseCode: otpResult.responseCode,
      error: otpResult.responseMessage || 'Failed to send OTP',
      transactionId: otpResult.transactionId,
    };
  }

  // Extract chained identifiers & cache session state in Redis
  const raw = otpResult.rawResponse || {};
  const chainedId = String(
    otpResult.transactionId ||
      raw.transactionId ||
      raw.transaction_id ||
      raw.requestId ||
      raw.request_id ||
      raw.referenceId ||
      raw.reference_id ||
      raw.token ||
      raw.sessionId ||
      raw.session_id ||
      raw.otpId ||
      raw.otp_id ||
      raw.id ||
      '',
  );

  const cachePayload = {
    msisdn,
    transactionId: chainedId,
    requestId: chainedId,
    referenceId: chainedId,
    token: raw.token || chainedId,
    sessionId: raw.sessionId || raw.session_id || chainedId,
    rawResponse: raw,
    timestamp: Date.now(),
  };

  if (visitId) {
    try {
      await redisService.set(
        `orange_bf:${visitId}`,
        JSON.stringify(cachePayload),
        900,
      );
    } catch {
      // Redis cache optional
    }
    try {
      await analyticsService.logEvent(
        parseInt(visitId, 10),
        VisitEventType.OTP_SEND,
        {
          source: 'orange_bf',
          phone: msisdn,
          success: true,
          responseCode: otpResult.responseCode ?? null,
          transactionId: chainedId,
        },
      );
    } catch {
      /* best-effort OTP send analytics log */
    }
  }
  if (campaign?.id && msisdn) {
    try {
      await redisService.set(
        `orange_bf:${campaign.id}:${msisdn}`,
        JSON.stringify(cachePayload),
        900,
      );
    } catch {
      // Redis cache optional
    }
  }

  return {
    success: true,
    status: ORANGE_BF_OUTCOMES.OTP_SENT,
    responseCode: otpResult.responseCode,
    transactionId: chainedId,
    message: 'OTP generated and sent successfully',
  };
};
