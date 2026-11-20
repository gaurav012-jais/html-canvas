/**
 * OTP Service Facade
 *
 * Orchestrates SMS & Partner API OTP workflows:
 * - Send OTP & API expose send mediation (delegated to send/send.service.js)
 * - Verify OTP, API expose verify & subscriber checksub (delegated to verify/verify.service.js)
 * - Security guards: rate limiting and brute force defense
 *
 * @module modules/otp/otp.service
 */
import { sendOtp, exposeSendOtp, isRateLimited } from './send/send.service.js';
import {
  verifyOtp,
  exposeVerifyOtp,
  exposeChecksub,
  isBruteForceAttempt,
  isVisitOtpVerified,
} from './verify/verify.service.js';

export {
  sendOtp,
  verifyOtp,
  exposeChecksub,
  exposeSendOtp,
  exposeVerifyOtp,
  isRateLimited,
  isBruteForceAttempt,
  isVisitOtpVerified,
};

/**
 * Creates the consolidated OTP service instance.
 */
export const createOtpService = () => ({
  sendOtp,
  verifyOtp,
  exposeChecksub,
  exposeSendOtp,
  exposeVerifyOtp,
  isRateLimited,
  isBruteForceAttempt,
  isVisitOtpVerified,
});

export const otpService = createOtpService();
