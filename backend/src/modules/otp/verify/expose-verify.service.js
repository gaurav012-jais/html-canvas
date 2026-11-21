import { redisService } from '../../../common/services/redis.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { smsProviderManager } from '../providers/sms-provider.manager.js';
import { cappingService } from '../../campaigns/capping.service.js';
import { HELD_OTP_MESSAGE, parsePayoutPercent } from '../helpers/payout.js';
import {
  getCampaignRepo,
  getVisitRepo,
  exposePendingKey,
  serializeInboundBody,
  normalizeMsisdn,
  assertApiExposeCampaign,
  resolveAssignedVendor,
  resolveExposePayoutHold,
  logInboundExpose,
  logOtpEvent,
  logOtpApiCall,
  ensureExposeVisit,
  getApiConfigForCampaign,
} from '../helpers/expose-common.js';
import { isTerminalExposeVisit } from '../helpers/expose-visit.js';
import { isBruteForceAttempt } from './verify-guards.js';

/**
 * Public API-expose mediator for vendor OTP verify.
 * Handles payout haircut, approval hold, and conversion recording.
 *
 * @param {Object} params - { campaignId, vendorId, phone, otp, otpCode, ip, ua, txid }
 * @param {string} clientIp - Remote client IP
 * @param {Object} [meta] - Request metadata
 * @returns {Promise<Object>}
 */
export const exposeVerifyOtp = async (
  { campaignId, vendorId, phone, otp, otpCode, ip, ua, txid } = {},
  clientIp,
  meta = {},
) => {
  const cId = parseInt(campaignId, 10);
  const code = otpCode || otp;
  if (!cId) throw Object.assign(new Error('campaignId is required'), { statusCode: 400 });
  const msisdn = normalizeMsisdn(phone);
  if (!msisdn) throw Object.assign(new Error('Phone number is required'), { statusCode: 400 });
  const otpPin = String(code || '').trim();
  if (!otpPin) throw Object.assign(new Error('OTP code is required'), { statusCode: 400 });
  const inboundUrl =
    meta?.requestUrl || `/api/otp/${cId}/${vendorId || '{vendorId}'}/verify`;
  const inboundBody = serializeInboundBody({
    msisdn,
    otp: otpPin,
    vendorId: vendorId || null,
  });

  if (await isBruteForceAttempt(clientIp, null)) {
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: 429,
      success: false,
      errorMessage: 'Too many failed verification attempts',
    });
    const err = new Error(
      'Too many failed verification attempts. Please try again later.',
    );
    err.statusCode = 429;
    throw err;
  }

  const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
  try {
    assertApiExposeCampaign(campaign);
  } catch (err) {
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
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

  if (
    cappingResult.isCapped &&
    cappingResult.action === 'fallback' &&
    cappingResult.targetCampaign
  ) {
    activeCampaign = cappingResult.targetCampaign;
    activeCId = activeCampaign.id;
  }

  let vendor;
  let tracking;
  try {
    ({ vendor, tracking } = await resolveAssignedVendor(
      activeCampaign,
      vendorId,
    ));
  } catch (err) {
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
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

  const finalIp = ip ? String(ip).split(',')[0].trim() : clientIp ? String(clientIp).split(',')[0].trim() : '';
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

  const apiConfig = await getApiConfigForCampaign(activeCId);
  const { providerConfig, provider } =
    smsProviderManager.getProvider(apiConfig);

  if (!(providerConfig.verifyUrl || providerConfig.verify_url)) {
    const msg =
      'Partner OTP verify URL is not configured. Set it in Campaign API settings.';
    await logInboundExpose({
      callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
      visit,
      campaignId: activeCId,
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

  let providerRequestId = '';
  const pending =
    (await redisService.get(exposePendingKey(activeCId, vendor.id, phone))) ||
    (await redisService.get(exposePendingKey(cId, vendor.id, phone)));
  if (pending?.providerRequestId) {
    providerRequestId = pending.providerRequestId;
  }

  const finalTxid = txid || visit.clickId || String(visit.id);
  const context = {
    campaignId: cId,
    campaignName: campaign?.name || '',
    visitId: visit.id,
    clickId: visit.clickId,
    ip: finalIp,
    ua: finalUa,
    txid: finalTxid,
  };

  const verifyResult = await provider.verifyOtp(
    msisdn,
    otpPin,
    providerRequestId,
    providerConfig,
    context,
  );

  let held = false;
  let payoutSeq = null;
  const trackingPayout =
    tracking?.payoutPercent != null && tracking.payoutPercent !== ''
      ? tracking.payoutPercent
      : providerConfig?.payoutPercent;
  let payoutPercent = parsePayoutPercent(trackingPayout);
  const alreadyVerified = isTerminalExposeVisit(visit);
  if (verifyResult?.success) {
    const decision = await resolveExposePayoutHold(
      cId,
      vendor.id,
      trackingPayout,
      visit.clickId || String(visit.id),
    );
    held = decision.held;
    payoutSeq = decision.seq;
    payoutPercent = decision.payoutPercent;
  }

  const clientSuccess = Boolean(verifyResult?.success) && !held;
  const clientError = held
    ? HELD_OTP_MESSAGE
    : verifyResult?.error || 'OTP verification failed';
  const inboundHttpStatus = clientSuccess ? 200 : held ? 400 : verifyResult?.httpStatus || 400;
  const inboundBodyOut = held
    ? { statusCode: 400, error: 'Error', message: HELD_OTP_MESSAGE, held: true }
    : {
        message: clientSuccess ? verifyResult.message || 'OTP verified successfully' : clientError,
        phone: msisdn,
        msisdn,
        verified: clientSuccess,
        responseCode: verifyResult?.responseCode ?? null,
        visitId: visit.id,
        clickId: visit.clickId,
        vendorId: vendor.id,
      };

  await logInboundExpose({
    callType: ApiCallType.OTP_EXPOSE_VERIFY_IN,
    visit,
    campaignId: cId,
    phone: msisdn,
    requestUrl: inboundUrl,
    requestBody: inboundBody,
    responseStatus: inboundHttpStatus,
    responseBody: inboundBodyOut,
    success: clientSuccess,
    errorMessage: clientSuccess ? null : clientError,
    statusLabel: held ? 'HELD' : clientSuccess ? 'SUCCESS' : 'FAILED',
  });

  await logOtpApiCall({
    callType: ApiCallType.OTP_VERIFY,
    visit,
    campaignId: cId,
    phone: msisdn,
    result: verifyResult,
  });

  await logOtpEvent(visit.id, VisitEventType.OTP_VERIFY, {
    source: 'otp_expose',
    campaignId: cId,
    vendorId: vendor.id,
    msisdn,
    inboundUrl,
    partnerUrl: verifyResult?.requestUrl || null,
    responseCode: verifyResult?.responseCode ?? null,
    success: Boolean(verifyResult?.success),
    held,
    payoutPercent,
    seq: payoutSeq,
    clientResponse: held ? 'invalid_otp' : undefined,
    error: verifyResult?.success ? undefined : verifyResult?.error,
    httpStatus: verifyResult?.httpStatus ?? null,
  });

  if (!verifyResult?.success) {
    const err = new Error(verifyResult?.error || 'OTP verification failed');
    err.statusCode = 400;
    throw err;
  }

  if (!alreadyVerified) {
    await getVisitRepo().update(
      { id: visit.id },
      { otpVerifiedAt: new Date(), visitStatus: VisitStatus.SUCCESS },
    );
    const convCampaignId = visit.campaignId || activeCId;
    await cappingService.incrementCampaignConversionCount(
      convCampaignId,
      activeCampaign.cappingInterval,
      vendor.id,
    );
  }
  await redisService.del(exposePendingKey(activeCId, vendor.id, phone));
  await redisService.del(exposePendingKey(cId, vendor.id, phone));

  if (held) {
    const err = new Error(HELD_OTP_MESSAGE);
    err.statusCode = 400;
    throw err;
  }

  return inboundBodyOut;
};
