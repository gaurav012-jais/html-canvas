import { campaignsService } from '../../campaigns/campaigns.service.js';
import { flowEngineService } from '../../flow/core/engine.js';
import { campaignVendorPerf } from '../../otp/helpers/conversion.js';
import { normalizeFailureReason } from '../../otp/helpers/failure-reason.js';
import { resolveFlowOrBoth } from '../../flow/flows/index.js';
import { resolveConversionRule } from '../../flow/flows/conversion-rule.js';
import { resolveRangeBounds } from '../../../common/zoned-day.js';
import {
  jsonBoolSql,
  buildVendorClicksQuery,
  buildVendorEventsQuery,
  buildVendorPostbacksQuery,
  buildVendorFailuresQuery,
} from './vendor-stats-query.builder.js';

export {
  jsonBoolSql,
  buildVendorClicksQuery,
  buildVendorEventsQuery,
  buildVendorPostbacksQuery,
  buildVendorFailuresQuery,
};

export const getCampaignVendorStats = async (campaignId, userId, options = {}) => {
  const campaign = await campaignsService.findOne(campaignId, userId);
  const { flowConfig } = await campaignsService.getFlow(campaignId, userId);
  const apiExpose = flowEngineService.isApiExposeFlow(flowConfig);
  const flow = resolveFlowOrBoth(
    flowEngineService.normalizeMode(campaign.verificationMode),
  );
  const conversionRule = resolveConversionRule(flow, { apiExpose });
  const cId = parseInt(campaignId, 10);
  const successTrue = jsonBoolSql('event.metadata', 'success');
  const heldTrue = jsonBoolSql('event.metadata', 'held');

  const { from, to } = resolveRangeBounds(options);

  const clickRows = await buildVendorClicksQuery({ cId, from, to })
    .groupBy('visit.vendorId')
    .getRawMany();

  const eventRows = await buildVendorEventsQuery({
    cId,
    from,
    to,
    successTrue,
    heldTrue,
  })
    .groupBy('visit.vendorId')
    .getRawMany();

  const postbackRows = await buildVendorPostbacksQuery({ cId, from, to })
    .groupBy('p.vendorId')
    .getRawMany();

  const statsByVendor = new Map();
  const emptyStats = () => ({
    clicks: 0,
    requested: 0,
    liveVerified: 0,
    held: 0,
    failedSend: 0,
    failedVerify: 0,
    failedApi: 0,
    failedBreakdown: {},
    failedVerifyBreakdown: {},
    failedSendBreakdown: {},
    subscribeSuccess: 0,
    postbacksMatched: 0,
    postbacksSent: 0,
    pinRequest: 0,
    uniquePinSend: 0,
    pinValRequest: 0,
    uniquePinValRequest: 0,
    uniquePinVal: 0,
    homeView: 0,
    subscribeClick: 0,
    cgRedirect: 0,
  });
  const ensure = (vendorId) => {
    const key = Number(vendorId) || 0;
    if (!statsByVendor.has(key)) statsByVendor.set(key, emptyStats());
    return statsByVendor.get(key);
  };

  for (const row of clickRows) {
    ensure(row.vendorId).clicks = Number(row.clicks) || 0;
  }
  for (const row of eventRows) {
    const prev = ensure(row.vendorId);
    prev.requested = Number(row.requested) || 0;
    prev.liveVerified = Number(row.liveVerified) || 0;
    prev.held = Number(row.held) || 0;
    prev.failedSend = Number(row.failedSend) || 0;
    prev.failedVerify = Number(row.failedVerify) || 0;
    prev.failedApi = (Number(row.failedSend) || 0) + (Number(row.failedVerify) || 0);
    prev.subscribeSuccess = Number(row.subscribeSuccess) || 0;
    prev.pinRequest = Number(row.pinRequest) || 0;
    prev.uniquePinSend = Number(row.uniquePinSend) || 0;
    prev.pinValRequest = Number(row.pinValRequest) || 0;
    prev.uniquePinValRequest = Number(row.uniquePinValRequest) || 0;
    prev.uniquePinVal = Number(row.uniquePinVal) || 0;
    prev.homeView = Number(row.homeView) || 0;
    prev.subscribeClick = Number(row.subscribeClick) || 0;
    prev.cgRedirect = Number(row.cgRedirect) || 0;
  }

  const failedRows = await buildVendorFailuresQuery({
    cId,
    from,
    to,
    successTrue,
  }).getRawMany();

  for (const r of failedRows) {
    const vid = Number(r.vendorId ?? r.visit_vendor_id ?? r.vendor_id) || 0;
    const prev = ensure(vid);
    let meta = r.metadata ?? r.event_metadata;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {}
    }
    const eventType = r.eventType ?? r.event_event_type ?? r.event_type;
    const reason = normalizeFailureReason(meta, eventType);

    prev.failedBreakdown[reason] = (prev.failedBreakdown[reason] || 0) + 1;
    if (eventType === 'OTP_VERIFY') {
      prev.failedVerifyBreakdown[reason] =
        (prev.failedVerifyBreakdown[reason] || 0) + 1;
    } else if (eventType === 'OTP_SEND') {
      prev.failedSendBreakdown[reason] =
        (prev.failedSendBreakdown[reason] || 0) + 1;
    }
  }

  for (const [, prev] of statsByVendor.entries()) {
    if (prev.failedVerify > 0) {
      const verifyCount = Object.values(prev.failedVerifyBreakdown).reduce(
        (a, b) => a + b,
        0,
      );
      if (verifyCount < prev.failedVerify) {
        const diff = prev.failedVerify - verifyCount;
        prev.failedVerifyBreakdown['Wrong PIN'] =
          (prev.failedVerifyBreakdown['Wrong PIN'] || 0) + diff;
      }
    }
    if (prev.failedApi > 0) {
      const apiCount = Object.values(prev.failedBreakdown).reduce(
        (a, b) => a + b,
        0,
      );
      if (apiCount < prev.failedApi) {
        const diff = prev.failedApi - apiCount;
        prev.failedBreakdown['Wrong PIN'] =
          (prev.failedBreakdown['Wrong PIN'] || 0) + diff;
      }
    }
  }

  for (const row of postbackRows) {
    const prev = ensure(row.vendorId);
    prev.postbacksMatched = Number(row.postbacksMatched) || 0;
    prev.postbacksSent = Number(row.postbacksSent) || 0;
  }

  const seen = new Set();
  const vendors = [];
  for (const t of campaign.trackings || []) {
    const vendor = t.vendor || {};
    const vendorId = Number(vendor.id || t.vendorId);
    if (!vendorId || seen.has(vendorId)) continue;
    seen.add(vendorId);
    const raw = statsByVendor.get(vendorId) || {};
    vendors.push({
      vendorId,
      vendorName: vendor.name || `Vendor #${vendorId}`,
      vendorCode: vendor.code || null,
      assignmentActive: t.active !== false,
      payoutPercent: Number(t.payoutPercent ?? 100),
      ...campaignVendorPerf({ ...raw, apiExpose, conversionRule }),
    });
  }

  for (const [vendorId, raw] of statsByVendor.entries()) {
    if (!vendorId || seen.has(vendorId)) continue;
    seen.add(vendorId);
    vendors.push({
      vendorId,
      vendorName: `Vendor #${vendorId}`,
      vendorCode: null,
      assignmentActive: false,
      payoutPercent: 100,
      ...campaignVendorPerf({ ...raw, apiExpose, conversionRule }),
    });
  }

  vendors.sort(
    (a, b) => b.totalClicks - a.totalClicks || a.vendorName.localeCompare(b.vendorName),
  );

  return { apiExpose, conversionRule, vendors };
};

export const createCampaignVendorStatsService = () => ({
  jsonBoolSql,
  getCampaignVendorStats,
});

export const campaignVendorStatsService = createCampaignVendorStatsService();
