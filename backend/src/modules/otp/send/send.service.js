import { redisService } from '../../../common/services/redis.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { smsProviderManager } from '../providers/sms-provider.manager.js';
import { flowEngineService } from '../../flow/flow-engine.service.js';
import { orangeBfService } from '../../flow/orange-bf.service.js';
import { cappingService } from '../../campaigns/capping.service.js';
import {
  getCampaignRepo,
  getVisitRepo,
  pendingKey,
  exposePendingKey,
  serializeInboundBody,
  normalizeMsisdn,
  assertApiExposeCampaign,
  resolveAssignedVendor,
  logInboundExpose,
  logOtpEvent,
  logOtpApiCall,
  ensureExposeVisit,
  getCampaignFromInput,
  getApiConfigForCampaign,
  loadVisit,
} from '../helpers/expose-common.js';
import {
  isAlreadySubscribedText,
  isTerminalExposeVisit,
} from '../helpers/expose-visit.js';

/**
 * Checks rate limiting for OTP sends (max 5 per minute per IP / visit).
 *
 * @param {string} [ip] - Client IP address
 * @param {number|string} [visitId] - Session visit ID
 * @returns {Promise<boolean>} True if rate limited
 */
export const isRateLimited = async (ip, visitId) => {
  const key = ip
    ? `ratelimit:ip:${ip}`
    : visitId
      ? `ratelimit:visit:${visitId}`
      : null;
  if (!key) return false;
  const count = await redisService.incr(key, 60);
  if (count > 5) {
    if (visitId) {
      await logOtpEvent(visitId, VisitEventType.RATE_LIMIT_HIT, { ip, count });
    }
    return true;
  }
  return false;
};

/**
 * Sends OTP in standard web subscription funnel.
 *
 * @param {Object} sendOtpDto - { phone, campaignId, visitId, pack }
 * @param {string} clientIp - Client IP address
 * @returns {Promise<Object>} Response status and provider details
 */
export const sendOtp = async (sendOtpDto, clientIp) => {
  const { phone, campaignId, visitId, pack } = sendOtpDto;

  if (!phone || !String(phone).trim()) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  if (await isRateLimited(clientIp, visitId)) {
    const err = new Error(
      'Too many requests. Please wait a minute before requesting another OTP.',
    );
    err.statusCode = 429;
    throw err;
  }

  const visit = await loadVisit(visitId);
  const campaign = await getCampaignFromInput(campaignId, visitId);

  if (
    flowEngineService.normalizeMode(campaign?.verificationMode) === 'ORANGE_BF'
  ) {
    const result = await orangeBfService.startOrCheckSub({
      phone: String(phone).trim(),
      campaignId: campaign?.id,
      visitId,
      vendorId: visit?.vendorId,
    });
    if (!result.success) {
      const err = new Error(
        result.error || result.message || 'Failed to send OTP',
      );
      err.statusCode = 400;
      throw err;
    }
    if (visitId) {
      try {
        await getVisitRepo().update(
          { id: parseInt(visitId, 10) },
          { phone: String(phone).trim(), otpVerifiedAt: null },
        );
      } catch {
        // swallow
      }
    }
    return {
      message: result.message || 'OTP sent successfully',
      phone: String(phone).trim(),
      provider: 'orange_bf',
      remoteVerify: true,
      responseCode: result.responseCode ?? null,
      transactionId: result.transactionId || null,
      isSubscribed: Boolean(result.isSubscribed),
      status: result.status,
      forwardUrl: result.forwardUrl,
    };
  }

  const apiConfig = await getApiConfigForCampaign(campaign?.id);
  const { providerConfig, provider } =
    smsProviderManager.getProvider(apiConfig);

  if (
    !(providerConfig.sendUrl || providerConfig.send_url || providerConfig.url)
  ) {
    const err = new Error(
      'Partner OTP send URL is not configured. Set it in Campaign API settings.',
    );
    err.statusCode = 400;
    throw err;
  }

  const context = {
    campaignId: campaign?.id,
    campaignName: campaign?.name || '',
    visitId: visitId ? parseInt(visitId, 10) : undefined,
    pack: pack || 'daily',
  };

  const sendResult = await provider.sendOtp(
    String(phone).trim(),
    '',
    providerConfig,
    context,
  );

  await logOtpApiCall({
    callType: ApiCallType.OTP_SEND,
    visit,
    campaignId: campaign?.id,
    phone: String(phone).trim(),
    result: sendResult,
  });

  if (visitId) {
    await logOtpEvent(visitId, VisitEventType.OTP_SEND, {
      phone: String(phone).trim(),
      campaignId: campaign?.id,
      provider: 'partner',
      responseCode: sendResult?.responseCode ?? null,
      success: Boolean(sendResult?.success),
      error: sendResult?.success ? undefined : sendResult?.error,
    });
  }

  if (!sendResult?.success) {
    const err = new Error(sendResult?.error || 'Failed to send OTP');
    err.statusCode = 502;
    throw err;
  }

  if (visitId && sendResult.providerRequestId) {
    await redisService.set(
      pendingKey(visitId, phone),
      {
        providerRequestId: sendResult.providerRequestId,
        phone: String(phone).trim(),
      },
      15 * 60,
    );
  }

  if (visitId) {
    try {
      await getVisitRepo().update(
        { id: parseInt(visitId, 10) },
        { phone: String(phone).trim(), otpVerifiedAt: null },
      );
    } catch {
      // swallow
    }
  }

  return {
    message: sendResult.message || 'OTP sent successfully',
    phone: String(phone).trim(),
    provider: 'partner',
    remoteVerify: true,
    responseCode: sendResult.responseCode ?? null,
    providerRequestId: sendResult.providerRequestId || null,
  };
};

/**
 * Public API-expose mediator for vendor OTP send.
 *
 * @param {Object} params - { campaignId, vendorId, phone, pack, ip, ua, txid }
 * @param {string} clientIp - Remote client IP
 * @param {Object} [meta] - Request metadata
 * @returns {Promise<Object>}
 */
export const exposeSendOtp = async (
  { campaignId, vendorId, phone, pack, ip, ua, txid },
  clientIp,
  meta = {},
) => {
  const cId = parseInt(campaignId, 10);
  if (!cId) {
    const err = new Error('campaignId is required');
    err.statusCode = 400;
    throw err;
  }
  if (!phone || !String(phone).trim()) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  const msisdn = normalizeMsisdn(phone);
  if (!msisdn) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }
  const inboundUrl =
    meta.requestUrl || `/api/otp/${cId}/${vendorId || '{vendorId}'}/send`;
  const inboundBody = serializeInboundBody({
    msisdn,
    pack: pack || 'daily',
    vendorId: vendorId || null,
  });

  if (await isRateLimited(clientIp, null)) {
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_SEND_IN,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: 429,
      success: false,
      errorMessage: 'Too many requests',
    });
    const err = new Error(
      'Too many requests. Please wait a minute before requesting another OTP.',
    );
    err.statusCode = 429;
    throw err;
  }

  const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
  try {
    assertApiExposeCampaign(campaign);
  } catch (err) {
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_SEND_IN,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: err.statusCode || 400,
      success: false,
      errorMessage: err.message,
    });
    throw err;
  }

  let activeCampaign = campaign;
  let activeCId = cId;
  const cappingResult = await cappingService.evaluateCapping(campaign, {
    vendorId,
  });

  if (cappingResult.isCapped) {
    if (cappingResult.action === 'fallback' && cappingResult.targetCampaign) {
      activeCampaign = cappingResult.targetCampaign;
      activeCId = activeCampaign.id;
    } else {
      const stoppedMsg = 'Offer is stopped due to capping limit';
      await logInboundExpose({
        callType: ApiCallType.OTP_EXPOSE_SEND_IN,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 403,
        success: false,
        errorMessage: stoppedMsg,
        statusLabel: 'OFFER_STOPPED',
      });
      const err = new Error(stoppedMsg);
      err.statusCode = 403;
      err.code = 'OFFER_STOPPED';
      throw err;
    }
  }

  let vendor;
  try {
    ({ vendor } = await resolveAssignedVendor(activeCampaign, vendorId));
  } catch (err) {
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_SEND_IN,
      campaignId: activeCId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: err.statusCode || 400,
      success: false,
      errorMessage: err.message,
    });
    throw err;
  }

  const finalIp = ip
    ? String(ip).split(',')[0].trim()
    : clientIp
      ? String(clientIp).split(',')[0].trim()
      : '';
  const finalUa = ua || '';

  const visit = await ensureExposeVisit({
    campaign: activeCampaign,
    phone: msisdn,
    clientIp: finalIp,
    userAgent: finalUa,
    customClickId: txid || null,
    landingUrl: inboundUrl,
    visitStatus: VisitStatus.OTP_SHOWN,
    vendorId: vendor.id,
  });

  await cappingService.incrementCampaignClickCount(
    activeCId,
    activeCampaign.cappingInterval,
    vendor.id,
  );

  const apiConfig = await getApiConfigForCampaign(activeCId);
  const { providerConfig, provider } =
    smsProviderManager.getProvider(apiConfig);

  if (
    !(providerConfig.sendUrl || providerConfig.send_url || providerConfig.url)
  ) {
    const msg =
      'Partner OTP send URL is not configured. Set it in Campaign API settings.';
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_SEND_IN,
      visit,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: 400,
      success: false,
      errorMessage: msg,
    });
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }

  const finalTxid = txid || visit.clickId || String(visit.id);
  const context = {
    campaignId: cId,
    campaignName: campaign?.name || '',
    visitId: visit.id,
    clickId: visit.clickId,
    pack: pack || 'daily',
    ip: finalIp,
    ua: finalUa,
    txid: finalTxid,
  };

  const sendResult = await provider.sendOtp(
    msisdn,
    '',
    providerConfig,
    context,
  );
  const alreadySubscribed =
    !sendResult?.success &&
    isTerminalExposeVisit(visit) &&
    isAlreadySubscribedText(sendResult?.error, sendResult?.rawResponse);
  const sendStatusLabel = alreadySubscribed ? 'ALREADY_SUBSCRIBED' : undefined;

  const responsePayload = {
    message: sendResult?.success
      ? sendResult.message || 'OTP sent successfully'
      : sendResult?.error || 'Failed to send OTP',
    phone: msisdn,
    msisdn,
    provider: 'partner',
    remoteVerify: true,
    responseCode: sendResult?.responseCode ?? null,
    providerRequestId: sendResult?.providerRequestId || null,
    sent: Boolean(sendResult?.success),
    visitId: visit.id,
    clickId: visit.clickId,
    vendorId: vendor.id,
  };

  await logInboundExpose({
    callType: ApiCallType.OTP_EXPOSE_SEND_IN,
    visit,
    campaignId: cId,
    phone: msisdn,
    requestUrl: inboundUrl,
    requestBody: inboundBody,
    responseStatus: sendResult?.success ? 200 : sendResult?.httpStatus || 502,
    responseBody: responsePayload,
    success: Boolean(sendResult?.success),
    errorMessage: sendResult?.success
      ? null
      : sendResult?.error || 'Failed to send OTP',
    statusLabel: sendStatusLabel,
  });

  await logOtpApiCall({
    callType: ApiCallType.OTP_SEND,
    visit,
    campaignId: cId,
    phone: msisdn,
    result: sendResult,
    statusLabel: sendStatusLabel,
  });

  await logOtpEvent(visit.id, VisitEventType.OTP_SEND, {
    source: 'otp_expose',
    campaignId: cId,
    vendorId: vendor.id,
    msisdn,
    pack: pack || 'daily',
    inboundUrl,
    partnerUrl: sendResult?.requestUrl || null,
    responseCode: sendResult?.responseCode ?? null,
    success: Boolean(sendResult?.success),
    alreadySubscribed,
    error: sendResult?.success ? undefined : sendResult?.error,
    httpStatus: sendResult?.httpStatus ?? null,
  });

  if (!sendResult?.success) {
    const err = new Error(sendResult?.error || 'Failed to send OTP');
    err.statusCode = 502;
    throw err;
  }

  if (sendResult.providerRequestId) {
    await redisService.set(
      exposePendingKey(cId, vendor.id, phone),
      {
        providerRequestId: sendResult.providerRequestId,
        phone: msisdn,
        visitId: visit.id,
        vendorId: vendor.id,
      },
      15 * 60,
    );
  }

  return responsePayload;
};
