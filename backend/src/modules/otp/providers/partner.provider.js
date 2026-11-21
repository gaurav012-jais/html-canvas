/**
 * Partner SMS Provider (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized partner OTP modules:
 * - partner-rules.js: Headers parsing, placeholder substitution, business success rules & error formatting
 * - partner-send-otp.js: Partner HTTP OTP generation/send operations
 * - partner-verify-otp.js: Partner HTTP OTP validation operations
 */

import { getSuccessRule } from './partner/partner-rules.js';
import { partnerSendOtp } from './partner/partner-send-otp.js';
import { partnerVerifyOtp } from './partner/partner-verify-otp.js';

export { getSuccessRule };

export const partnerProvider = {
  sendOtp: partnerSendOtp,
  verifyOtp: partnerVerifyOtp,
};
