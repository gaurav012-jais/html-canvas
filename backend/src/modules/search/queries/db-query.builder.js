import { Brackets } from 'typeorm';
import { resolveRangeBounds } from '../../../common/zoned-day.js';

export const applyDbFilters = (queryBuilder, params, options = {}) => {
  if (Array.isArray(params.campaignId)) {
    queryBuilder.where('visit.campaignId IN (:...campaignIds)', {
      campaignIds: params.campaignId.length > 0 ? params.campaignId : [-1],
    });
  } else {
    queryBuilder.where('visit.campaignId = :campaignId', {
      campaignId: params.campaignId,
    });
  }

  if (params.visitId !== undefined) {
    queryBuilder.andWhere('event.visitId = :visitId', {
      visitId: params.visitId,
    });
  }
  if (params.eventType && !options.ignoreEventType) {
    queryBuilder.andWhere('event.eventType = :eventType', {
      eventType: params.eventType,
    });
  }
  if (params.status) {
    queryBuilder.andWhere('visit.visitStatus = :status', {
      status: params.status,
    });
  }
  if (params.vendorId) {
    queryBuilder.andWhere('visit.vendorId = :vendorId', {
      vendorId: params.vendorId,
    });
  }
  if (params.affiliateId) {
    queryBuilder.andWhere('visit.affiliateId = :affiliateId', {
      affiliateId: params.affiliateId,
    });
  }
  if (params.clickId) {
    queryBuilder.andWhere('visit.clickId = :clickId', {
      clickId: params.clickId,
    });
  }
  if (params.rcid) {
    queryBuilder.andWhere('visit.rcid = :rcid', {
      rcid: params.rcid,
    });
  }
  if (params.from || params.to) {
    const { from, to } = resolveRangeBounds(params);
    if (from) {
      queryBuilder.andWhere('event.createdAt >= :from', { from });
    }
    if (to) {
      queryBuilder.andWhere('event.createdAt <= :to', { to });
    }
  }

  if (params.q) {
    const dbQuery = params.q.replace(/\*/g, '_');
    const searchLike = `%${dbQuery}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('visit.clickId LIKE :searchLike', { searchLike })
          .orWhere('visit.rcid LIKE :searchLike', { searchLike })
          .orWhere('visit.vidRaw LIKE :searchLike', { searchLike })
          .orWhere('visit.affRaw LIKE :searchLike', { searchLike })
          .orWhere('visit.phone LIKE :searchLike', { searchLike })
          .orWhere('visit.campid LIKE :searchLike', { searchLike })
          .orWhere('visit.trackingCampid LIKE :searchLike', { searchLike })
          .orWhere('visit.ipAddress LIKE :searchLike', { searchLike })
          .orWhere('visit.userAgent LIKE :searchLike', { searchLike });
      }),
    );
  }
};

export const applyVisitFilters = (queryBuilder, params) => {
  if (Array.isArray(params.campaignId)) {
    queryBuilder.where('visit.campaignId IN (:...campaignIds)', {
      campaignIds: params.campaignId.length > 0 ? params.campaignId : [-1],
    });
  } else {
    queryBuilder.where('visit.campaignId = :campaignId', {
      campaignId: params.campaignId,
    });
  }

  if (params.visitId !== undefined) {
    queryBuilder.andWhere('visit.id = :visitId', { visitId: params.visitId });
  }
  if (params.vendorId) {
    queryBuilder.andWhere('visit.vendorId = :vendorId', {
      vendorId: params.vendorId,
    });
  }
  if (params.affiliateId) {
    queryBuilder.andWhere('visit.affiliateId = :affiliateId', {
      affiliateId: params.affiliateId,
    });
  }
  if (params.clickId) {
    queryBuilder.andWhere('visit.clickId = :clickId', {
      clickId: params.clickId,
    });
  }
  if (params.rcid) {
    queryBuilder.andWhere('visit.rcid = :rcid', { rcid: params.rcid });
  }
  if (params.from || params.to) {
    const { from, to } = resolveRangeBounds(params);
    if (from) queryBuilder.andWhere('visit.createdAt >= :from', { from });
    if (to) queryBuilder.andWhere('visit.createdAt <= :to', { to });
  }
  if (params.eventType) {
    queryBuilder.andWhere(
      `EXISTS (
        SELECT 1 FROM visit_events ve
        WHERE ve.visit_id = visit.id AND ve.event_type = :eventType
      )`,
      { eventType: params.eventType },
    );
  }
  if (params.status) {
    queryBuilder.andWhere('visit.visitStatus = :status', {
      status: params.status,
    });
  }
  if (params.q) {
    const dbQuery = params.q.replace(/\*/g, '_');
    const searchLike = `%${dbQuery}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('visit.clickId LIKE :searchLike', { searchLike })
          .orWhere('visit.rcid LIKE :searchLike', { searchLike })
          .orWhere('visit.vidRaw LIKE :searchLike', { searchLike })
          .orWhere('visit.affRaw LIKE :searchLike', { searchLike })
          .orWhere('visit.phone LIKE :searchLike', { searchLike })
          .orWhere('visit.campid LIKE :searchLike', { searchLike })
          .orWhere('visit.trackingCampid LIKE :searchLike', { searchLike })
          .orWhere('visit.ipAddress LIKE :searchLike', { searchLike })
          .orWhere('visit.userAgent LIKE :searchLike', { searchLike });
      }),
    );
  }
};
