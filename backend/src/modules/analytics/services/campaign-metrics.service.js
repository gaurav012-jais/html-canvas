import { getRepository } from '../../../database/index.js';
import { Visit, VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { campaignsService } from '../../campaigns/campaigns.service.js';

const getVisitRepo = () => getRepository(Visit);
const getVisitEventRepo = () => getRepository(VisitEvent);

export const getCampaignAnalytics = async (campaignId, userId) => {
  await campaignsService.findOne(campaignId, userId);
  const cId = parseInt(campaignId, 10);

  const totalVisits = await getVisitRepo().count({
    where: { campaignId: cId },
  });
  const blockedUsers = await getVisitRepo().count({
    where: { campaignId: cId, visitStatus: VisitStatus.BLOCKED },
  });
  const subscribedUsers = await getVisitRepo().count({
    where: { campaignId: cId, visitStatus: VisitStatus.SUBSCRIBED },
  });
  const successfulSubscriptions = await getVisitRepo().count({
    where: { campaignId: cId, visitStatus: VisitStatus.SUCCESS },
  });
  const failedSubscriptions = await getVisitRepo().count({
    where: { campaignId: cId, visitStatus: VisitStatus.FAILED },
  });

  const blockedRequests = await getVisitEventRepo().count({
    where: {
      eventType: VisitEventType.BLOCKED_REQUEST,
      visit: { campaignId: cId },
    },
    relations: { visit: true },
  });

  const rateLimitHits = await getVisitEventRepo().count({
    where: {
      eventType: VisitEventType.RATE_LIMIT_HIT,
      visit: { campaignId: cId },
    },
    relations: { visit: true },
  });

  const bruteForceAttempts = await getVisitEventRepo().count({
    where: {
      eventType: VisitEventType.BRUTE_FORCE_ATTEMPT,
      visit: { campaignId: cId },
    },
    relations: { visit: true },
  });

  const conversionRate =
    totalVisits > 0
      ? parseFloat(((successfulSubscriptions / totalVisits) * 100).toFixed(2))
      : 0;

  return {
    totalVisits,
    blockedUsers,
    subscribedUsers,
    successfulSubscriptions,
    failedSubscriptions,
    conversionRate,
    blockedRequests,
    rateLimitHits,
    bruteForceAttempts,
  };
};

export const createCampaignMetricsService = () => ({
  getCampaignAnalytics,
});

export const campaignMetricsService = createCampaignMetricsService();
