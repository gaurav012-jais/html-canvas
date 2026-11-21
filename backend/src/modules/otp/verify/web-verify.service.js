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
import { isBruteForceAttempt } from './verify-guards.js';

/**
 * Verifies OTP in standard web subscription funnel.
 *
 * @param {Object} verifyOtpDto - { phone, otp, otpCode, visitId, campaignId }
 * @param {string} clientIp - Client IP
 * @returns {Promise<Object>} Verification status
 */
export const verifyOtp = async (verifyOtpDto = {}, clientIp) => {
  const phone = verifyOtpDto.phone;
  const otpCode = verifyOtpDto.otpCode || verifyOtpDto.otp;
  const visitId = verifyOtpDto.visitId;
  const campaignId = verifyOtpDto.campaignId;

  if (!phone || !String(phone).trim()) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  if (!otpCode || !String(otpCode).trim()) {
    const err = new Error('OTP code is required');
    err.statusCode = 400;
    throw err;
  }

  if (await isBruteForceAttempt(clientIp, visitId)) {
    const err = new Error(
      'Too many failed verification attempts. Please try again later.',
    );
    err.statusCode = 429;
    throw err;
  }

  const visit = await loadVisit(visitId);
  const campaign = await getCampaignFromInput(campaignId, visitId);

  if (
    flowEngineService.normalizeMode(campaign?.verificationMode) === 'ORANGE_BF'
  ) {
    const result = await orangeBfService.verifyOtp({
      phone: String(phone).trim(),
      otp: String(otpCode).trim(),
      campaignId: campaign?.id,
      visitId,
      vendorId: visit?.vendorId,
    });
    if (!result.success) {
      const err = new Error(
        result.error || result.message || 'OTP verification failed',
      );
      err.statusCode = 400;
      throw err;
    }
    if (visitId) {
      try {
        await getVisitRepo().update(
          { id: parseInt(visitId, 10) },
          { phone: String(phone).trim(), otpVerifiedAt: new Date() },
        );
      } catch (_) {
        // swallow
      }
    }
    return {
      message: result.message || 'OTP verified successfully',
      phone: String(phone).trim(),
      provider: 'orange_bf',
      responseCode: result.responseCode ?? null,
      transactionId: result.transactionId || null,
      forwardUrl: result.forwardUrl,
      postbackStatus: result.postbackStatus,
      verified: true,
    };
  }

  const apiConfig = await getApiConfigForCampaign(campaign?.id);
  const { providerConfig, provider } =
    smsProviderManager.getProvider(apiConfig);

  if (!(providerConfig.verifyUrl || providerConfig.verify_url)) {
    const err = new Error(
      'Partner OTP verify URL is not configured. Set it in Campaign API settings.',
    );
    err.statusCode = 400;
    throw err;
  }

  let providerRequestId = '';
  if (visitId) {
    const pending = await redisService.get(pendingKey(visitId, phone));
    if (pending?.providerRequestId) {
      providerRequestId = pending.providerRequestId;
    }
  }

  const verifyResult = await provider.verifyOtp(
    String(phone).trim(),
    String(otpCode).trim(),
    providerRequestId,
    providerConfig,
  );

  await logOtpApiCall({
    callType: ApiCallType.OTP_VERIFY,
    visit,
    campaignId: campaign?.id,
    phone: String(phone).trim(),
    result: verifyResult,
  });

  if (visitId) {
    await logOtpEvent(visitId, VisitEventType.OTP_VERIFY, {
      phone: String(phone).trim(),
      status: verifyResult?.success ? 'verified' : 'failed',
      provider: 'partner',
      responseCode: verifyResult?.responseCode ?? null,
      success: Boolean(verifyResult?.success),
      error: verifyResult?.success ? undefined : verifyResult?.error,
    });
  }

  if (!verifyResult?.success) {
    const err = new Error(verifyResult?.error || 'OTP verification failed');
    err.statusCode = 400;
    throw err;
  }

  if (visitId) {
    const vId = parseInt(visitId, 10);
    await getVisitRepo().update(
      { id: vId },
      {
        phone: String(phone).trim(),
        otpVerifiedAt: new Date(),
      },
    );
    await redisService.del(pendingKey(visitId, phone));
  }

  return {
    message: verifyResult.message || 'OTP verified successfully',
    phone: String(phone).trim(),
    verified: true,
    responseCode: verifyResult.responseCode ?? null,
  };
};
