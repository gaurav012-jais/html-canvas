import { redisService } from '../../../common/services/redis.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { smsProviderManager } from '../providers/sms-provider.manager.js';
import { flowEngineService } from '../../flow/core/engine.js';
import { orangeBfService } from '../../flow/orange-bf.service.js';
import {
  getVisitRepo,
  pendingKey,
  logOtpEvent,
  logOtpApiCall,
  getCampaignFromInput,
  getApiConfigForCampaign,
  loadVisit,
} from '../helpers/expose-common.js';

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
