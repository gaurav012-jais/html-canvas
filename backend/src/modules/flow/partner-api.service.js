/**
 * Partner API Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized partner sub-modules:
 * - partner-http.js: Headers parsing, placeholder interpolation, sanitization, and axios requests
 * - partner-check.service.js: MSISDN resolution, checksub lookup, caching & blocklist checks
 * - partner-subscribe.service.js: Direct telco subscriptions, skip tracking, and status labeling
 */

import {
  parseHeaders,
  resolveTemplate,
  buildVars,
  partnerRequestBody,
  sendRequest,
  logCall,
} from './partner/partner-http.js';

import {
  resolveMsisdn,
  parseCachedChecksubBody,
  checkSubscription,
  checkBlocked,
} from './partner/partner-check.service.js';

import {
  subscribeStatusLabel,
  subscribeRequestMeta,
  resolveSubscribeTemplate,
  recordSubscribeSkip,
  subscribe,
} from './partner/partner-subscribe.service.js';

import { mapSubServiceId } from './helpers/pack-url.js';

export {
  parseHeaders,
  resolveTemplate,
  mapSubServiceId,
  buildVars,
  partnerRequestBody,
  sendRequest,
  resolveMsisdn,
  checkSubscription,
  checkBlocked,
  subscribe,
  recordSubscribeSkip,
  parseCachedChecksubBody,
  subscribeStatusLabel,
  subscribeRequestMeta,
  resolveSubscribeTemplate,
  logCall,
};

export const createPartnerApiService = () => ({
  parseHeaders,
  resolveTemplate,
  mapSubServiceId,
  buildVars,
  partnerRequestBody,
  sendRequest,
  resolveMsisdn,
  checkSubscription,
  checkBlocked,
  subscribe,
  recordSubscribeSkip,
});

export const partnerApiService = createPartnerApiService();
