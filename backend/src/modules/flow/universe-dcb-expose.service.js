/**
 * Universe DCB Expose Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized Universe DCB sub-modules:
 * - dcb-expose-session: Session correlation keys, Redis locking, visit lookup by request ID
 * - dcb-expose-inbound: Inbound request audit logging, visit creation & lifecycle patching
 * - dcb-expose-context: Campaign DCB validation, vendor assignment, and carrier provider execution
 * - dcb-expose-operations: Orchestrates config, pincode, confirm, status, and screen generation
 */

import { universeDcbProvider } from './universe-dcb.provider.js';
import { apiCallLogService } from './api-call-log.service.js';
import {
  pickDcbExposeRequestId,
  httpError,
  cleanPhone,
  parseConfig,
  resolveAssignedVendor,
  correlationKey,
  requestCorrelationKey,
  saveCorrelation,
  loadCorrelation,
  clearCorrelation,
  acquireConfirmLock,
  releaseConfirmLock,
  loadVisitFromRequestId,
  loadLatestVisitForMsisdn,
} from './universe-dcb/dcb-expose-session.js';
import {
  logVisitEvent,
  patchExposeVisit,
  ensureExposeVisit,
  serializeBody,
  logInboundExpose,
  mintLogVisit,
  seedExposeVisit,
  runExpose,
} from './universe-dcb/dcb-expose-inbound.service.js';
import {
  assertDcbApiExpose,
  callProvider,
  providerInput,
  loadExposeContext,
} from './universe-dcb/dcb-expose-context.service.js';
import { createUniverseDcbExposeOperations } from './universe-dcb/dcb-expose-operations.service.js';

export {
  pickDcbExposeRequestId,
  httpError,
  cleanPhone,
  parseConfig,
  resolveAssignedVendor,
  correlationKey,
  requestCorrelationKey,
  saveCorrelation,
  loadCorrelation,
  clearCorrelation,
  acquireConfirmLock,
  releaseConfirmLock,
  loadVisitFromRequestId,
  loadLatestVisitForMsisdn,
  logVisitEvent,
  patchExposeVisit,
  ensureExposeVisit,
  serializeBody,
  logInboundExpose,
  mintLogVisit,
  seedExposeVisit,
  runExpose,
  assertDcbApiExpose,
  callProvider,
  providerInput,
  loadExposeContext,
  createUniverseDcbExposeOperations,
};

export const createUniverseDcbExposeService = (
  provider = universeDcbProvider,
  callLogger = apiCallLogService,
) => {
  return createUniverseDcbExposeOperations(provider, callLogger);
};

export const universeDcbExposeService = createUniverseDcbExposeService();
