/**
 * Orange Burkina Faso Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized Orange BF sub-services:
 * - orange-bf-helpers: MSISDN cleaning, test checks, config parser, postback queuing
 * - orange-bf-start.service: Subscription status check & OTP generation trigger
 * - orange-bf-verify.service: Auth OTP validation, sync subscription, postbacks & delayed checksub
 * - orange-bf-sub.service: Subscription status query & unsubscription flows
 */

import { startOrCheckSub } from './orange-bf/orange-bf-start.service.js';
import { verifyOtp } from './orange-bf/orange-bf-verify.service.js';
import { checkSub, unsubscribe } from './orange-bf/orange-bf-sub.service.js';

export {
  startOrCheckSub,
  verifyOtp,
  checkSub,
  unsubscribe,
};

export const createOrangeBfService = () => ({
  startOrCheckSub,
  verifyOtp,
  checkSub,
  unsubscribe,
});

export const orangeBfService = createOrangeBfService();
