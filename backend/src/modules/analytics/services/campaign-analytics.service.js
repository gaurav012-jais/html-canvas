import {
  getCampaignAnalytics,
  campaignMetricsService,
} from './campaign-metrics.service.js';
import {
  jsonBoolSql,
  getCampaignVendorStats,
  campaignVendorStatsService,
} from './campaign-vendor-stats.service.js';

export {
  getCampaignAnalytics,
  campaignMetricsService,
  jsonBoolSql,
  getCampaignVendorStats,
  campaignVendorStatsService,
};

export const createCampaignAnalyticsService = () => ({
  jsonBoolSql,
  getCampaignAnalytics,
  getCampaignVendorStats,
});

export const campaignAnalyticsService = createCampaignAnalyticsService();
