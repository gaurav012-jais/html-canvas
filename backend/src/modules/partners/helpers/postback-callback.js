/**
 * Postback Callback Handler (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized callback sub-modules:
 * - callback-parser.js: MSISDN and click ID parsers, serialization, and hit file logs
 * - callback-status.js: Dynamic status matching per campaign / vendor assignment
 * - callback-dispatcher.js: Lookup strategies, inbound event logging, and postback dispatch
 */

import { getRepository } from '../../../database/index.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { appendPostbackHitSafe } from './postback-day-report-file.js';
import {
  parseCallbackClickId,
  parseCallbackMsisdn,
  persistHit,
  callAnalytics,
} from './callback/callback-parser.js';
import { createCallbackDispatcher } from './callback/callback-dispatcher.js';

export { parseCallbackClickId, parseCallbackMsisdn };

export const createPostbackCallback = (deps = {}) => {
  const {
    getPostbackRepo,
    getVisitRepo,
    getVendorRepo = () => getRepository(Vendor),
    getCampaignRepo = () => getRepository(Campaign),
    getTrackingRepo = () => getRepository(CampaignTracking),
    logApiCall,
    registerPending,
    firePostback,
    appendHit = appendPostbackHitSafe,
    logEvent = (visitId, type, payload) =>
      callAnalytics('logEvent', visitId, type, payload),
    setVisitPhone = (id, phone) => callAnalytics('setVisitPhone', id, phone),
  } = deps;

  const dispatcher = createCallbackDispatcher({
    getPostbackRepo,
    getVisitRepo,
    getVendorRepo,
    getCampaignRepo,
    getTrackingRepo,
    logApiCall,
    registerPending,
    firePostback,
    logEvent,
    setVisitPhone,
  });

  const processOperatorCallback = async (query = {}) => {
    let result = { success: false, skipped: true, reason: 'unprocessed' };
    try {
      result = await dispatcher.processOperatorCallbackInner(query);
      return result;
    } catch (err) {
      result = {
        success: false,
        skipped: true,
        reason: err?.message || 'callback error',
      };
      throw err;
    } finally {
      try {
        await persistHit(appendHit, query, result);
      } catch (err) {
        console.warn(`callback hit file write failed: ${err?.message || err}`);
      }
    }
  };

  return { processOperatorCallback };
};
