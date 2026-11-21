import { Like } from 'typeorm';
import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { campaignsService } from '../../campaigns/campaigns.service.js';
import { derivePagePath } from './page-path.helper.js';

const getVisitRepo = () => getRepository(Visit);

export const getCampaignActivityLogs = async (campaignId, userId, query = {}) => {
  await campaignsService.assertOwnership(campaignId, userId);
  const cId = parseInt(campaignId, 10);
  const safeQuery = query || {};

  const page = Number(safeQuery.page) || 1;
  const limit = Number(safeQuery.limit) || 20;
  const skip = (page - 1) * limit;

  const where = { campaignId: cId };

  if (safeQuery.phone && safeQuery.phone.trim() !== '') {
    where.phone = Like(`%${safeQuery.phone.trim()}%`);
  }

  if (safeQuery.status && safeQuery.status.trim() !== '' && safeQuery.status !== 'all') {
    where.visitStatus = safeQuery.status;
  }

  const [data, total] = await getVisitRepo().findAndCount({
    where,
    relations: { events: true },
    order: {
      createdAt: 'DESC',
    },
    take: limit,
    skip,
  });

  data.forEach((visit) => {
    if (visit.events) {
      visit.events.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
  });

  const enrichedData = data.map((visit) => ({
    ...visit,
    pagePath: derivePagePath(visit),
  }));

  return {
    data: enrichedData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const createActivityLogsService = () => ({
  getCampaignActivityLogs,
});

export const activityLogsService = createActivityLogsService();
