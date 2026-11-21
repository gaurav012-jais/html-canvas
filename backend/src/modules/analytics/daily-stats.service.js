/**
 * Daily Stats Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized daily aggregation sub-modules:
 * - daily-rollup-collector: Raw visit, event, postback, and log aggregation for day rollups
 * - daily-rollup-manager: Rollup range orchestration, operator backfill detection, and database persistence
 * - daily-report.query: Multi-dimension aggregated reporting (date, campaign, vendor, campaign_vendor)
 * - daily-dashboard.query: High-level dashboard summary, conversion counting, and vendor quality breakdowns
 */

import {
  collectDay,
  n,
} from './daily/daily-rollup-collector.js';
import {
  MAX_ROLLUP_DAYS,
  persistDay,
  dayNeedsOperatorBackfill,
  lastRolledAt,
  rollupDay,
  aggregateDayFromRaw,
  ensureDay,
  rollupRange,
  rollupRecent,
} from './daily/daily-rollup-manager.js';
import {
  STAT_GROUP_BY_SAFE,
  resolveUserScope,
  getReport,
} from './daily/daily-report.query.js';
import { getDashboardSummary } from './daily/daily-dashboard.query.js';

export {
  MAX_ROLLUP_DAYS,
  n,
  collectDay,
  persistDay,
  dayNeedsOperatorBackfill,
  lastRolledAt,
  rollupDay,
  aggregateDayFromRaw,
  ensureDay,
  rollupRange,
  rollupRecent,
  STAT_GROUP_BY_SAFE,
  resolveUserScope,
  getReport,
  getDashboardSummary,
};

export const createDailyStatsService = () => ({
  rollupDay: (...args) => rollupDay(...args),
  rollupRange: (...args) => rollupRange(...args),
  rollupRecent: (...args) => rollupRecent(...args),
  ensureDay: (...args) => ensureDay(...args),
  aggregateDayFromRaw: (...args) => aggregateDayFromRaw(...args),
  getReport: (...args) => getReport(...args),
  getDashboardSummary: (...args) => getDashboardSummary(...args),
});

export const dailyStatsService = createDailyStatsService();
