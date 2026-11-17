import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { searchService } from '../search/search.service.js';
import { campaignsService } from '../campaigns/campaigns.service.js';

const buildParams = (campaignId, query) => {
  const interval =
    query.interval === 'hour' || query.interval === 'day'
      ? query.interval
      : undefined;
  return {
    campaignId,
    visitId: query.visitId ? Number(query.visitId) : undefined,
    from: query.from,
    to: query.to,
    eventType: query.eventType,
    status: query.status,
    compareEvents: query.compareEvents,
    vendorId: query.vendorId ? Number(query.vendorId) : undefined,
    affiliateId: query.affiliateId ? Number(query.affiliateId) : undefined,
    clickId: query.clickId,
    rcid: query.rcid,
    q: query.q,
    page: query.page ? Number(query.page) : undefined,
    size: query.size ? Number(query.size) : undefined,
    interval,
    timezone: query.timezone || 'Asia/Kolkata',
    view: query.view === 'sessions' ? 'sessions' : 'events',
  };
};

export const logsController = {
  status: asyncHandler(async (_req, res) => {
    res.json({ enabled: searchService.isEnabled() });
  }),

  campaignSearch: asyncHandler(async (req, res) => {
    const campaignId = parseInt(req.params.campaignId, 10);
    await campaignsService.findOne(campaignId, req.user.id);
    const data = await searchService.search(
      buildParams(campaignId, req.query || {}),
    );
    res.json(data);
  }),

  campaignExport: asyncHandler(async (req, res) => {
    const campaignId = parseInt(req.params.campaignId, 10);
    await campaignsService.findOne(campaignId, req.user.id);
    const params = buildParams(campaignId, req.query || {});
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    return searchService.exportLogs(params, format, res);
  }),

  campaignAggregations: asyncHandler(async (req, res) => {
    const campaignId = parseInt(req.params.campaignId, 10);
    await campaignsService.findOne(campaignId, req.user.id);
    const data = await searchService.aggregations(
      buildParams(campaignId, req.query || {}),
    );
    res.json(data);
  }),

  allSearch: asyncHandler(async (req, res) => {
    let campaigns = await campaignsService.findAll(req.user.id);
    const country = String(req.query.country || '').trim().toUpperCase();
    const operator = String(req.query.operator || '').trim().toLowerCase();
    const campaignId = req.query.campaignId ? parseInt(req.query.campaignId, 10) : null;

    if (campaignId && !Number.isNaN(campaignId)) {
      campaigns = campaigns.filter((c) => c.id === campaignId);
    } else {
      if (country) {
        campaigns = campaigns.filter(
          (c) =>
            String(c.country || '').toUpperCase() === country ||
            String(c.marketOperator?.country?.code || '').toUpperCase() === country ||
            String(c.marketOperator?.country?.name || '').toUpperCase() === country,
        );
      }
      if (operator) {
        campaigns = campaigns.filter(
          (c) =>
            String(c.operator || '').toLowerCase() === operator ||
            String(c.marketOperator?.code || '').toLowerCase() === operator ||
            String(c.marketOperator?.name || '').toLowerCase() === operator,
        );
      }
    }
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      return res.json({ total: 0, page: 1, size: 25, items: [] });
    }
    const data = await searchService.search(
      buildParams(campaignIds, req.query || {}),
    );
    res.json(data);
  }),

  allExport: asyncHandler(async (req, res) => {
    let campaigns = await campaignsService.findAll(req.user.id);
    const country = String(req.query.country || '').trim().toUpperCase();
    const operator = String(req.query.operator || '').trim().toLowerCase();
    const campaignId = req.query.campaignId ? parseInt(req.query.campaignId, 10) : null;

    if (campaignId && !Number.isNaN(campaignId)) {
      campaigns = campaigns.filter((c) => c.id === campaignId);
    } else {
      if (country) {
        campaigns = campaigns.filter(
          (c) =>
            String(c.country || '').toUpperCase() === country ||
            String(c.marketOperator?.country?.code || '').toUpperCase() === country ||
            String(c.marketOperator?.country?.name || '').toUpperCase() === country,
        );
      }
      if (operator) {
        campaigns = campaigns.filter(
          (c) =>
            String(c.operator || '').toLowerCase() === operator ||
            String(c.marketOperator?.code || '').toLowerCase() === operator ||
            String(c.marketOperator?.name || '').toLowerCase() === operator,
        );
      }
    }
    const campaignIds = campaigns.map((c) => c.id);
    const params = buildParams(campaignIds, req.query || {});
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    return searchService.exportLogs(params, format, res);
  }),

  allAggregations: asyncHandler(async (req, res) => {
    let campaigns = await campaignsService.findAll(req.user.id);
    const country = String(req.query.country || '').trim().toUpperCase();
    const operator = String(req.query.operator || '').trim().toLowerCase();
    const campaignId = req.query.campaignId ? parseInt(req.query.campaignId, 10) : null;

    if (campaignId && !Number.isNaN(campaignId)) {
      campaigns = campaigns.filter((c) => c.id === campaignId);
    } else {
      if (country) {
        campaigns = campaigns.filter(
          (c) =>
            String(c.country || '').toUpperCase() === country ||
            String(c.marketOperator?.country?.code || '').toUpperCase() === country ||
            String(c.marketOperator?.country?.name || '').toUpperCase() === country,
        );
      }
      if (operator) {
        campaigns = campaigns.filter(
          (c) =>
            String(c.operator || '').toLowerCase() === operator ||
            String(c.marketOperator?.code || '').toLowerCase() === operator ||
            String(c.marketOperator?.name || '').toLowerCase() === operator,
        );
      }
    }
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      return res.json({
        enabled: true,
        timeSeries: [],
        byEventType: [],
        byVendor: [],
        byAffiliate: [],
        byStatus: [],
        timeSeriesByEvent: [],
        compareEvents: ['VISIT', 'CG_REDIRECT'],
        funnelTotals: {
          VISIT: 0,
          CG_REDIRECT: 0,
        },
        otpStats: {
          requested: 0,
          verifiedLive: 0,
          verifiedVendor: 0,
          held: 0,
          liveConvPercent: 0,
          vendorConvPercent: 0,
          holdPercent: 0,
        },
      });
    }
    const data = await searchService.aggregations(
      buildParams(campaignIds, req.query || {}),
    );
    res.json(data);
  }),
};
