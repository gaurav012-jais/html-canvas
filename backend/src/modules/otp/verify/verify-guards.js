import { redisService } from '../../../common/services/redis.service.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { getVisitRepo, logOtpEvent } from '../helpers/expose-common.js';

/**
 * Checks brute-force OTP attempts (max 10 attempts per 10 minutes).
 *
 * @param {string} [ip] - Client IP
 * @param {number|string} [visitId] - Session visit ID
 * @returns {Promise<boolean>} True if brute force threshold is breached
 */
export const isBruteForceAttempt = async (ip, visitId) => {
  const key = ip
    ? `bruteforce:ip:${ip}`
    : visitId
      ? `bruteforce:visit:${visitId}`
      : null;
  if (!key) return false;
  const count = await redisService.incr(key, 600);
  if (count > 10) {
    if (visitId) {
      await logOtpEvent(visitId, VisitEventType.BRUTE_FORCE_ATTEMPT, {
        ip,
        count,
      });
    }
    return true;
  }
  return false;
};

/**
 * Checks whether a visit has verified an OTP.
 *
 * @param {number|string} visitId - Visit ID
 * @param {string} [phone] - Optional phone to match against
 * @returns {Promise<boolean>}
 */
export const isVisitOtpVerified = async (visitId, phone) => {
  if (!visitId) return false;
  const visit = await getVisitRepo().findOne({
    where: { id: parseInt(visitId, 10) },
  });
  if (!visit?.otpVerifiedAt) return false;
  if (
    phone &&
    visit.phone &&
    String(visit.phone).trim() !== String(phone).trim()
  ) {
    return false;
  }
  return true;
};
