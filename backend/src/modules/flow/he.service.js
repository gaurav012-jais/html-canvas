/**
 * Header Enrichment (HE) Service Facade
 *
 * Safe, backward-compatible Facade delegating to specialized HE sub-services:
 * - he/he-helpers: Config parser, session generator, redirect meta, and audit call logger
 * - he/safaricom-he.service: Safaricom Kenya hybrid WAP HE (server token + browser masked MSISDN)
 * - he/custom-http-he.service: Custom HTTP endpoint resolution (GET/POST)
 * - he/he-resolver.service: Master provider dispatcher and error/fallback coordinator
 */

import {
  parseJson,
  normalizePhone,
  applySafaricomDummyFallback,
  pickRedirectUrl,
  redirectMeta,
  makeSessionId,
  mergeHeaders,
  makeMessageId,
  serializeBody,
  redactSecrets,
  safeHeadersForLog,
  logCall,
  buildSafaricomClientConfig,
  extractMaskedPhone,
  recordClientSafaricomLogs,
} from './he/he-helpers.js';

import {
  fetchSafaricomToken,
  resolveSafaricomFromBrowser,
  resolveSafaricomMasked,
} from './he/safaricom-he.service.js';

import { resolveCustomHttp } from './he/custom-http-he.service.js';
import { resolveHe } from './he/he-resolver.service.js';

export {
  parseJson,
  normalizePhone,
  applySafaricomDummyFallback,
  pickRedirectUrl,
  redirectMeta,
  makeSessionId,
  mergeHeaders,
  makeMessageId,
  serializeBody,
  redactSecrets,
  safeHeadersForLog,
  logCall,
  buildSafaricomClientConfig,
  extractMaskedPhone,
  recordClientSafaricomLogs,
  fetchSafaricomToken,
  resolveSafaricomFromBrowser,
  resolveSafaricomMasked,
  resolveCustomHttp,
  resolveHe as resolve,
};

export const createHeService = () => ({
  resolve: (...args) => resolveHe(...args),
  parseJson,
  normalizePhone,
  redirectMeta,
  pickRedirectUrl,
  makeSessionId,
  buildSafaricomClientConfig,
  extractMaskedPhone,
  recordClientSafaricomLogs,
  resolveSafaricomMasked,
  resolveCustomHttp,
});

export const heService = createHeService();
