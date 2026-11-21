/**
 * Postback Register (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized postback registration modules:
 * - register-delayed-checksub.js: Universal 30-min audit checksub scheduler
 * - register-pending.js: MSISDN-unique postback upsert & immediate dispatch
 * - postback-template.js: Macro replacement, affiliate RCID extraction & serialization
 */

import { getRepository } from '../../../database/index.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { ConversionPostback } from '../../../database/entities/conversion-postback.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { searchService } from '../../search/search.service.js';
import { apiCallLogService } from '../../flow/api-call-log.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { appendPostbackHitSafe } from './postback-day-report-file.js';
import { fillTemplate } from './postback-template.js';
import { createRegisterPending } from './register/register-pending.js';

/** Returns full MSISDN for UI display (no masking). */
export const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

export {
  affiliateRcidFromLandingUrl,
  affiliateRcidFromVisit,
  applyVisitAttributionToPostback,
  fillTemplate,
  serializeBody,
} from './postback-template.js';

export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export const createPostbackRegister = (deps) => {
  const {
    getPostbackRepo = () => getRepository(ConversionPostback),
    getVendorRepo = () => getRepository(Vendor),
    getVisitRepo = () => getRepository(Visit),
    getTrackingRepo = () => getRepository(CampaignTracking),
    firePostback,
  } = deps;

  const resolvePostbackTemplate = async (vendorId) => {
    let template = '';
    if (vendorId) {
      const vendor = await getVendorRepo().findOne({ where: { id: vendorId } });
      if (vendor?.postbackUrl?.trim()) template = vendor.postbackUrl.trim();
    }
    return { template, vendorId };
  };

  /** Visit often has no vendorId when opened without ?vid= — use campaign trackings. */
  const resolveVendorFromCampaign = async (campaignId) => {
    if (!campaignId) return { vendorId: null, template: '' };
    const trackings = await getTrackingRepo().find({
      where: { campaignId: parseInt(campaignId, 10), active: true },
      order: { id: 'ASC' },
      take: 20,
    });
    for (const t of trackings) {
      if (!t.vendorId) continue;
      const { template, vendorId } = await resolvePostbackTemplate(t.vendorId);
      if (template) return { vendorId, template };
    }
    const firstVendorId = trackings.find((t) => t.vendorId)?.vendorId || null;
    return { vendorId: firstVendorId, template: '' };
  };

  const indexPostbackEvent = async (row, eventType, extra = {}) => {
    void searchService.indexEvent({
      campaignId: row.campaignId,
      visitId: row.visitId,
      vendorId: row.vendorId,
      affiliateId: row.affiliateId,
      clickId: row.clickId,
      rcid: row.rcid,
      campid: row.campid,
      trackingCampid: row.trackingCampid,
      phoneMasked: maskPhone(row.msisdn),
      phone: row.msisdn || null,
      eventType,
      status: row.status,
      responseStatus: row.httpStatus,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  };

  const logApiCall = async (input) => {
    try {
      await apiCallLogService.record(input);
    } catch (err) {
      console.warn(`postback api_call_logs write failed: ${err.message}`);
    }
    if (
      input?.callType === ApiCallType.BILLING_CALLBACK ||
      input?.callType === ApiCallType.VENDOR_POSTBACK
    ) {
      await appendPostbackHitSafe({ ...input, createdAt: new Date() });
    }
  };

  const registerPending = createRegisterPending({
    getPostbackRepo,
    getVisitRepo,
    resolvePostbackTemplate,
    resolveVendorFromCampaign,
    indexPostbackEvent,
    firePostback,
  });

  return {
    fillTemplate,
    resolvePostbackTemplate,
    indexPostbackEvent,
    logApiCall,
    registerPending,
  };
};
