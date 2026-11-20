import { getRepository } from '../../../database/index.js';
import { Visit, VisitStatus } from '../../../database/entities/visit.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import {
  getPeriodMetadata,
  getVendorPeriodMetadata,
} from './capping-interval.util.js';

export const createCappingCountsService = () => {
  const getVisitRepo = () => getRepository(Visit);

  const getCampaignClickCount = async (campaignId, interval = 'daily') => {
    const { redisKey, periodStart, ttl } = getPeriodMetadata(campaignId, interval);
    try {
      const cached = await redisService.get(redisKey);
      if (cached !== null && cached !== undefined) {
        return parseInt(cached, 10) || 0;
      }
    } catch {
      // redis error fallback to db
    }

    // DB Fallback count from visits table
    let count = 0;
    try {
      const qb = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaign_id = :campaignId', { campaignId });

      if (periodStart) {
        qb.andWhere('v.created_at >= :periodStart', { periodStart });
      }

      count = await qb.getCount();

      try {
        await redisService.set(redisKey, count, ttl);
      } catch {
        // ignore redis error
      }
    } catch (err) {
      console.warn(
        `Failed to get click count for campaign ${campaignId}: ${err.message}`,
      );
    }

    return count;
  };

  const getVendorClickCount = async (
    campaignId,
    vendorId,
    interval = 'daily',
  ) => {
    if (!campaignId || !vendorId) return 0;
    const { redisKey, periodStart, ttl } = getVendorPeriodMetadata(
      campaignId,
      vendorId,
      interval,
    );
    try {
      const cached = await redisService.get(redisKey);
      if (cached !== null && cached !== undefined) {
        return parseInt(cached, 10) || 0;
      }
    } catch {
      // redis error fallback to db
    }

    let count = 0;
    try {
      const qb = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaign_id = :campaignId', { campaignId })
        .andWhere('v.vendor_id = :vendorId', { vendorId });

      if (periodStart) {
        qb.andWhere('v.created_at >= :periodStart', { periodStart });
      }

      count = await qb.getCount();

      try {
        await redisService.set(redisKey, count, ttl);
      } catch {
        // ignore redis error
      }
    } catch (err) {
      console.warn(
        `Failed to get click count for campaign ${campaignId} vendor ${vendorId}: ${err.message}`,
      );
    }

    return count;
  };

  const incrementVendorClickCount = async (
    campaignId,
    vendorId,
    interval = 'daily',
  ) => {
    if (!campaignId || !vendorId) return null;
    const { redisKey, ttl } = getVendorPeriodMetadata(
      campaignId,
      vendorId,
      interval,
      new Date(),
      'clicks',
    );
    try {
      const nextVal = await redisService.incr(redisKey, ttl);
      if (nextVal > 0) return nextVal;
      const curr = await getVendorClickCount(campaignId, vendorId, interval);
      const manualNext = curr + 1;
      await redisService.set(redisKey, manualNext, ttl);
      return manualNext;
    } catch (err) {
      console.warn(
        `Failed to increment click count for campaign ${campaignId} vendor ${vendorId}: ${err.message}`,
      );
      return null;
    }
  };

  const incrementCampaignClickCount = async (
    campaignId,
    interval = 'daily',
    vendorId = null,
  ) => {
    if (vendorId) {
      await incrementVendorClickCount(campaignId, vendorId, interval).catch(
        () => {},
      );
    }
    const { redisKey, ttl } = getPeriodMetadata(
      campaignId,
      interval,
      new Date(),
      'clicks',
    );
    try {
      const nextVal = await redisService.incr(redisKey, ttl);
      if (nextVal > 0) return nextVal;
      // If redis is not connected or returned 0, fallback
      const curr = await getCampaignClickCount(campaignId, interval);
      const manualNext = curr + 1;
      await redisService.set(redisKey, manualNext, ttl);
      return manualNext;
    } catch (err) {
      console.warn(
        `Failed to increment click count for campaign ${campaignId}: ${err.message}`,
      );
      return null;
    }
  };

  const getCampaignConversionCount = async (campaignId, interval = 'daily') => {
    const { redisKey, periodStart, ttl } = getPeriodMetadata(
      campaignId,
      interval,
      new Date(),
      'conversions',
    );
    try {
      const cached = await redisService.get(redisKey);
      if (cached !== null && cached !== undefined) {
        return parseInt(cached, 10) || 0;
      }
    } catch {
      // redis error fallback to db
    }

    // DB Fallback count from visits table for completed conversions
    let count = 0;
    try {
      const qb = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaign_id = :campaignId', { campaignId })
        .andWhere(
          '(v.visit_status IN (:...convStatuses) OR v.otp_verified_at IS NOT NULL)',
          {
            convStatuses: [
              VisitStatus.SUCCESS,
              VisitStatus.SUBSCRIBED,
              'OTP_VERIFIED',
              'CONFIRMED',
            ],
          },
        );

      if (periodStart) {
        qb.andWhere('v.created_at >= :periodStart', { periodStart });
      }

      count = await qb.getCount();

      try {
        await redisService.set(redisKey, count, ttl);
      } catch {
        // ignore redis error
      }
    } catch (err) {
      console.warn(
        `Failed to get conversion count for campaign ${campaignId}: ${err.message}`,
      );
    }

    return count;
  };

  const getVendorConversionCount = async (
    campaignId,
    vendorId,
    interval = 'daily',
  ) => {
    if (!campaignId || !vendorId) return 0;
    const { redisKey, periodStart, ttl } = getVendorPeriodMetadata(
      campaignId,
      vendorId,
      interval,
      new Date(),
      'conversions',
    );
    try {
      const cached = await redisService.get(redisKey);
      if (cached !== null && cached !== undefined) {
        return parseInt(cached, 10) || 0;
      }
    } catch {
      // redis error fallback to db
    }

    let count = 0;
    try {
      const qb = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaign_id = :campaignId', { campaignId })
        .andWhere('v.vendor_id = :vendorId', { vendorId })
        .andWhere(
          '(v.visit_status IN (:...convStatuses) OR v.otp_verified_at IS NOT NULL)',
          {
            convStatuses: [
              VisitStatus.SUCCESS,
              VisitStatus.SUBSCRIBED,
              'OTP_VERIFIED',
              'CONFIRMED',
            ],
          },
        );

      if (periodStart) {
        qb.andWhere('v.created_at >= :periodStart', { periodStart });
      }

      count = await qb.getCount();

      try {
        await redisService.set(redisKey, count, ttl);
      } catch {
        // ignore redis error
      }
    } catch (err) {
      console.warn(
        `Failed to get conversion count for campaign ${campaignId} vendor ${vendorId}: ${err.message}`,
      );
    }

    return count;
  };

  const incrementVendorConversionCount = async (
    campaignId,
    vendorId,
    interval = 'daily',
  ) => {
    if (!campaignId || !vendorId) return null;
    const { redisKey, ttl } = getVendorPeriodMetadata(
      campaignId,
      vendorId,
      interval,
      new Date(),
      'conversions',
    );
    try {
      const nextVal = await redisService.incr(redisKey, ttl);
      if (nextVal > 0) return nextVal;
      const curr = await getVendorConversionCount(
        campaignId,
        vendorId,
        interval,
      );
      const manualNext = curr + 1;
      await redisService.set(redisKey, manualNext, ttl);
      return manualNext;
    } catch (err) {
      console.warn(
        `Failed to increment conversion count for campaign ${campaignId} vendor ${vendorId}: ${err.message}`,
      );
      return null;
    }
  };

  const incrementCampaignConversionCount = async (
    campaignId,
    interval = 'daily',
    vendorId = null,
  ) => {
    if (vendorId) {
      await incrementVendorConversionCount(
        campaignId,
        vendorId,
        interval,
      ).catch(() => {});
    }
    const { redisKey, ttl } = getPeriodMetadata(
      campaignId,
      interval,
      new Date(),
      'conversions',
    );
    try {
      const nextVal = await redisService.incr(redisKey, ttl);
      if (nextVal > 0) return nextVal;
      // If redis is not connected or returned 0, fallback
      const curr = await getCampaignConversionCount(campaignId, interval);
      const manualNext = curr + 1;
      await redisService.set(redisKey, manualNext, ttl);
      return manualNext;
    } catch (err) {
      console.warn(
        `Failed to increment conversion count for campaign ${campaignId}: ${err.message}`,
      );
      return null;
    }
  };

  return {
    getCampaignClickCount,
    incrementCampaignClickCount,
    getVendorClickCount,
    incrementVendorClickCount,
    getCampaignConversionCount,
    incrementCampaignConversionCount,
    getVendorConversionCount,
    incrementVendorConversionCount,
  };
};
