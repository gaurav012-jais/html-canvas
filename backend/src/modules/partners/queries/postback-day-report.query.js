/**
 * Postback Day Report Query (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized query helpers:
 * - day-report-collector.js: SQL queries for postbacks, call logs, and visit events
 * - day-report-bucketer.js: Groups records into MSISDN / visit buckets and resolves lookups
 * - day-report-composer.js: Builds number stories, hits, summaries, and paginates
 */

import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  resolveRangeBounds,
} from '../../../common/zoned-day.js';
import { parseReportQuery } from '../helpers/report-filters.js';
import { emptyDayReport, todayYmd } from '../helpers/postback-day-report.js';
import { collectDayReportData } from './day-report/day-report-collector.js';
import { bucketDayReportRecords } from './day-report/day-report-bucketer.js';
import { composeDayReport } from './day-report/day-report-composer.js';

export function createPostbackDayReportQuery(deps, scope) {
  const { resolveUserScope } = scope;

  const getDayReport = async (userId, query = {}) => {
    const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
    let startYmd = String(query.from || query.date || todayYmd(timezone)).slice(0, 10);
    let endYmd = String(query.to || startYmd).slice(0, 10);
    if (startYmd > endYmd) {
      const swap = startYmd;
      startYmd = endYmd;
      endYmd = swap;
    }
    const MAX_RANGE_DAYS = 93;
    const startUtc = Date.parse(`${startYmd}T00:00:00Z`);
    const endUtc = Date.parse(`${endYmd}T00:00:00Z`);
    let rangeClamped = false;
    if (Number.isFinite(startUtc) && Number.isFinite(endUtc)) {
      const span = Math.round((endUtc - startUtc) / 86400000);
      if (span > MAX_RANGE_DAYS) {
        const clamped = new Date(startUtc);
        clamped.setUTCDate(clamped.getUTCDate() + MAX_RANGE_DAYS);
        endYmd = clamped.toISOString().slice(0, 10);
        rangeClamped = true;
      }
    }
    const date = startYmd;
    const endDate = endYmd;
    const { from, to } = resolveRangeBounds({ from: date, to: endDate, timezone });
    const meta = { date, timezone, from: date, to: endDate, rangeClamped };

    const { campaignIds, vendorIds, vendors } = await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return emptyDayReport(meta);
    }

    const filters = parseReportQuery(query);
    if (filters.campaignId && !campaignIds.includes(filters.campaignId)) {
      return emptyDayReport(meta);
    }
    if (filters.vendorId && !vendorIds.includes(filters.vendorId)) {
      return emptyDayReport(meta);
    }
    const scopedCampaignIds = filters.campaignId ? [filters.campaignId] : campaignIds;
    const scopedVendorIds = filters.vendorId ? [filters.vendorId] : vendorIds;
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    const { postbacks, logs, events } = await collectDayReportData({
      deps,
      scope,
      from,
      to,
      scopedCampaignIds,
      scopedVendorIds,
      filters,
    });

    const { buckets, campaignMap } = await bucketDayReportRecords({
      deps,
      postbacks,
      logs,
      events,
      scopedCampaignIds,
      scopedVendorIds,
      vendorMap,
    });

    return composeDayReport({
      deps,
      buckets,
      logs,
      vendorMap,
      campaignMap,
      timezone,
      date,
      endDate,
      rangeClamped,
      filters,
      query,
    });
  };

  return { getDayReport };
}
