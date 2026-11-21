/**
 * OTP Verify Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized OTP verification sub-services:
 * - verify-guards: Brute force defense rate limiting & visit verification status checks
 * - web-verify.service: Standard in-page web subscription funnel OTP verification
 * - expose-checksub.service: API expose subscriber checksub mediation (Carrier / DCB / Partner API)
 * - expose-verify.service: API expose OTP verification, payout haircut, hold & conversions
 */

import {
  isBruteForceAttempt,
  isVisitOtpVerified,
} from './verify-guards.js';
import { verifyOtp } from './web-verify.service.js';
import { exposeChecksub } from './expose-checksub.service.js';
import { exposeVerifyOtp } from './expose-verify.service.js';

export {
  isBruteForceAttempt,
  isVisitOtpVerified,
  verifyOtp,
  exposeChecksub,
  exposeVerifyOtp,
};

export const createVerifyService = () => ({
  isBruteForceAttempt: (...args) => isBruteForceAttempt(...args),
  isVisitOtpVerified: (...args) => isVisitOtpVerified(...args),
  verifyOtp: (...args) => verifyOtp(...args),
  exposeChecksub: (...args) => exposeChecksub(...args),
  exposeVerifyOtp: (...args) => exposeVerifyOtp(...args),
});

export const verifyService = createVerifyService();
