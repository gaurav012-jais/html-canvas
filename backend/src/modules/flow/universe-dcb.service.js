/**
 * Universe DCB Service (Facade)
 *
 * Orchestrates Direct Carrier Billing PIN/Confirm/Checksub state machine.
 */

import { universeDcbProvider } from './universe-dcb.provider.js';
import { apiCallLogService } from './api-call-log.service.js';
import { createDcbOperations } from './dcb/dcb-operations.service.js';

export {
  httpError,
  parseConfig,
  cleanPhone,
  stripProviderRequestIds,
  loadDcbContext,
  correlationKey,
  saveCorrelation,
  loadCorrelation,
  clearCorrelation,
} from './dcb/dcb-context.service.js';
export {
  providerInput,
  callProviderWithLogging,
  readProviderPurchaseTypes,
} from './dcb/dcb-provider-caller.js';
export { createDcbOperations } from './dcb/dcb-operations.service.js';

export const createUniverseDcbService = (
  provider = universeDcbProvider,
  callLogger = apiCallLogService,
) => {
  return createDcbOperations(provider, callLogger);
};

export const universeDcbService = createUniverseDcbService();
