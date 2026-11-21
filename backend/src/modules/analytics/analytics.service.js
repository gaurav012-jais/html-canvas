/**
 * Analytics Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized analytics sub-services:
 * - visit-tracking.service: Visit CRUD, lifecycle, dedupe, attribution, event indexing & logging
 * - campaign-metrics.service: Campaign-level counts, rates & security metrics
 * - campaign-vendor-stats.service: Vendor performance aggregations, breakdowns & postbacks
 * - campaign-analytics.service: Orchestrates campaign metrics & vendor stats
 * - activity-logs.service: Campaign paginated activity logs & search
 * - visit-detail.service: Visit timeline, API call summaries & status labeling
 * - analytics-archive.service: Data retention archival to JSONL and database pruning
 */

import {
  maskPhone,
  indexVisitEvent,
  createVisit,
  getVisit,
  findRecentVisitByRcid,
  updateVisit,
  setVisitPhone,
  ensureVisitCampids,
  ensureVisitAttribution,
  abandonOrphanVisit,
  hasVisitEvent,
  logEvent,
  visitTrackingService,
} from './services/visit-tracking.service.js';

import {
  getCampaignAnalytics,
  campaignMetricsService,
} from './services/campaign-metrics.service.js';

import {
  jsonBoolSql,
  getCampaignVendorStats,
  campaignVendorStatsService,
} from './services/campaign-vendor-stats.service.js';

import {
  campaignAnalyticsService,
} from './services/campaign-analytics.service.js';

import {
  getCampaignActivityLogs,
  activityLogsService,
} from './services/activity-logs.service.js';

import {
  parseJsonSafe,
  checksubStatusLabel,
  derivePagePath,
  getVisitDetail,
  visitDetailService,
} from './services/visit-detail.service.js';

import {
  archiveOldData,
  analyticsArchiveService,
} from './services/analytics-archive.service.js';

export {
  maskPhone,
  indexVisitEvent,
  createVisit,
  getVisit,
  findRecentVisitByRcid,
  updateVisit,
  setVisitPhone,
  ensureVisitCampids,
  ensureVisitAttribution,
  abandonOrphanVisit,
  hasVisitEvent,
  logEvent,
  visitTrackingService,
  jsonBoolSql,
  getCampaignAnalytics,
  campaignMetricsService,
  getCampaignVendorStats,
  campaignVendorStatsService,
  campaignAnalyticsService,
  parseJsonSafe,
  checksubStatusLabel,
  derivePagePath,
  getCampaignActivityLogs,
  activityLogsService,
  getVisitDetail,
  visitDetailService,
  archiveOldData,
  analyticsArchiveService,
};

export const createAnalyticsService = () => ({
  maskPhone,
  indexVisitEvent,
  createVisit,
  getVisit,
  findRecentVisitByRcid,
  getVisitDetail,
  updateVisit,
  setVisitPhone,
  ensureVisitCampids,
  ensureVisitAttribution,
  abandonOrphanVisit,
  hasVisitEvent,
  logEvent,
  getCampaignAnalytics,
  getCampaignVendorStats,
  getCampaignActivityLogs,
  derivePagePath,
  archiveOldData,
});

export const analyticsService = createAnalyticsService();
