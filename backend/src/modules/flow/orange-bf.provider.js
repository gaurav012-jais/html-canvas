/**
 * Orange Burkina Faso Provider (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized provider sub-modules:
 * - orange-bf-client.js: HTTP client initialization, defaults, URL interpolation, and JSON parsing
 * - orange-bf-auth.ops.js: Auth OTP generation and validation operations
 * - orange-bf-sub.ops.js: Subscription status checks, unsubscribe, and synchronization operations
 */

import axios from 'axios';
import {
  ORANGE_BF_DEFAULTS,
  parseHeaders,
  tryParseJson,
  resolveTemplate,
  createOrangeBfHttpClient,
} from './orange-bf/provider/orange-bf-client.js';
import { createOrangeBfAuthOps } from './orange-bf/provider/orange-bf-auth.ops.js';
import { createOrangeBfSubOps } from './orange-bf/provider/orange-bf-sub.ops.js';

export {
  ORANGE_BF_DEFAULTS,
  parseHeaders,
  tryParseJson,
  resolveTemplate,
  createOrangeBfHttpClient,
};

export const createOrangeBfProvider = ({ httpClient = axios } = {}) => {
  const { request } = createOrangeBfHttpClient({ httpClient });
  const authOps = createOrangeBfAuthOps(request);
  const subOps = createOrangeBfSubOps(request);

  return {
    ...authOps,
    ...subOps,
  };
};

export const orangeBfProvider = createOrangeBfProvider();
