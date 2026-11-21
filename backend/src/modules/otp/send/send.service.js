/**
 * Send OTP Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized OTP send sub-services:
 * - web-send.service.js: Standard funnel rate limiting, Orange BF routing, and partner SMS dispatch
 * - expose-send.service.js: Advertiser/Vendor API expose mediation, capping, and logging
 */

import { isRateLimited, sendOtp } from './web-send.service.js';
import { exposeSendOtp } from './expose-send.service.js';

export {
  isRateLimited,
  sendOtp,
  exposeSendOtp,
};

export const createSendService = () => ({
  isRateLimited,
  sendOtp,
  exposeSendOtp,
});

export const sendService = createSendService();
