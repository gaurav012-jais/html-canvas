import { getRepository } from '../../database/index.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { Visit, VisitStatus } from '../../database/entities/visit.entity.js';
import { redisService } from '../../common/services/redis.service.js';
import { partnersService } from '../partners/partners.service.js';
import { DEFAULT_TIMEZONE, zonedDayBound } from '../../common/zoned-day.js';

const pad = (n) => String(n).padStart(2, '0');

/** Get YYYY, MM, DD, and weekday for current instant in target timezone (IST Asia/Kolkata) */
export const getZonedDateParts = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: bag.year,
    month: pad(bag.month),
    day: pad(bag.day),
    ymd: `${bag.year}-${pad(bag.month)}-${pad(bag.day)}`,
    weekday: bag.weekday,
  };
};

/**
 * For a given YYYY-MM-DD in IST, find the Monday of that week in IST.
 */
export const getMondayYmd = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  dt.setUTCDate(dt.getUTCDate() - diffToMonday);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/**
 * Returns { redisKey, periodStart, ttl } for a campaign and interval in IST.
 * - daily: resets every day at 00:00 IST
 * - weekly: resets every Monday at 00:00 IST
 * - monthly: resets on 1st of every month at 00:00 IST
 * - total: lifetime / no automatic reset
 */
export const getPeriodMetadata = (
  campaignId,
  interval = 'daily',
  now = new Date(),
  metric = 'clicks',
) => {
  const normInterval = String(interval || 'daily').toLowerCase();
  const normMetric =
    String(metric || 'clicks').toLowerCase() === 'conversions'
      ? 'conv'
      : 'count';
  const { year, month, ymd } = getZonedDateParts(now, DEFAULT_TIMEZONE);

  if (normInterval === 'total' || normInterval === 'lifetime') {
    return {
      redisKey: `capping:${normMetric}:${campaignId}:total`,
      periodStart: null,
      ttl: 86400 * 365,
    };
  }

  if (normInterval === 'weekly') {
    const mondayYmd = getMondayYmd(ymd);
    return {
      redisKey: `capping:${normMetric}:${campaignId}:weekly:${mondayYmd}`,
      periodStart: zonedDayBound(mondayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 14,
    };
  }

  if (normInterval === 'monthly') {
    const firstDayYmd = `${year}-${month}-01`;
    return {
      redisKey: `capping:${normMetric}:${campaignId}:monthly:${year}-${month}`,
      periodStart: zonedDayBound(firstDayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 60,
    };
  }

  // Default: daily
  return {
    redisKey: `capping:${normMetric}:${campaignId}:daily:${ymd}`,
    periodStart: zonedDayBound(ymd, DEFAULT_TIMEZONE, 'start'),
    ttl: 86400 * 2,
  };
};

/**
 * Returns { redisKey, periodStart, ttl } for vendor capping on a campaign and interval in IST.
 * - daily: resets every day at 00:00 IST
 * - weekly: resets every Monday at 00:00 IST
 * - monthly: resets on 1st of every month at 00:00 IST
 * - total: lifetime / no automatic reset
 */
export const getVendorPeriodMetadata = (
  campaignId,
  vendorId,
  interval = 'daily',
  now = new Date(),
  metric = 'clicks',
) => {
  const normInterval = String(interval || 'daily').toLowerCase();
  const normMetric =
    String(metric || 'clicks').toLowerCase() === 'conversions'
      ? 'conv'
      : 'count';
  const { year, month, ymd } = getZonedDateParts(now, DEFAULT_TIMEZONE);
  const vId = Number(vendorId) || 0;

  if (normInterval === 'total' || normInterval === 'lifetime') {
    return {
      redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:total`,
      periodStart: null,
      ttl: 86400 * 365,
    };
  }

  if (normInterval === 'weekly') {
    const mondayYmd = getMondayYmd(ymd);
    return {
      redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:weekly:${mondayYmd}`,
      periodStart: zonedDayBound(mondayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 14,
    };
  }

  if (normInterval === 'monthly') {
    const firstDayYmd = `${year}-${month}-01`;
    return {
      redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:monthly:${year}-${month}`,
      periodStart: zonedDayBound(firstDayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 60,
    };
  }

  // Default: daily
  return {
    redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:daily:${ymd}`,
    periodStart: zonedDayBound(ymd, DEFAULT_TIMEZONE, 'start'),
    ttl: 86400 * 2,
  };
};

export const createCappingService = () => {
  const getCampaignRepo = () => getRepository(Campaign);
  const getTrackingRepo = () => getRepository(CampaignTracking);
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

  const resolveVendorId = async (vid, vendorId) => {
    if (vendorId != null && !Number.isNaN(Number(vendorId))) {
      return Number(vendorId);
    }
    if (vid) {
      const numVid = Number(vid);
      if (!Number.isNaN(numVid) && Number.isInteger(numVid) && numVid > 0) {
        return numVid;
      }
      const attr = await partnersService.resolveAttribution(vid).catch(() => ({}));
      if (attr?.vendorId) return Number(attr.vendorId);
    }
    return null;
  };

  const isVendorAssignedToCampaign = async (campaignId, resolvedVendorId) => {
    if (!campaignId || !resolvedVendorId) return false;
    const tracking = await getTrackingRepo().findOne({
      where: {
        campaignId: Number(campaignId),
        vendorId: Number(resolvedVendorId),
        active: true,
      },
    });
    return Boolean(tracking);
  };

  /**
   * Evaluate if campaign or vendor reached its capping limit (clicks or conversions), and determine action.
   * Checks campaign capping first; if allowed, checks vendor capping (on CampaignTracking).
   * Returns:
   *  - { isCapped: false, action: 'allow', resolvedVendorId }
   *  - { isCapped: true, action: 'stop', cappedEntity: 'campaign'|'vendor', reason: string, ... }
   *  - { isCapped: true, action: 'fallback', cappedEntity: 'campaign'|'vendor', targetCampaign: object, resolvedVendorId: number }
   */
  const evaluateCapping = async (campaign, { vid, vendorId } = {}) => {
    if (!campaign) {
      return { isCapped: false, action: 'allow' };
    }

    const resolvedVendorId = await resolveVendorId(vid, vendorId);

    // 1. Evaluate Campaign Capping first (if enabled)
    if (campaign.cappingEnabled) {
      const limit =
        campaign.cappingLimit != null ? Number(campaign.cappingLimit) : null;
      if (limit && limit > 0) {
        const interval = campaign.cappingInterval || 'daily';
        const metric = String(
          campaign.cappingMetric || 'conversions',
        ).toLowerCase();
        const currentCount =
          metric === 'clicks'
            ? await getCampaignClickCount(campaign.id, interval)
            : await getCampaignConversionCount(campaign.id, interval);

        if (currentCount >= limit) {
          // Cap limit reached on campaign!
          const action = String(campaign.cappingAction || 'stop').toLowerCase();
          if (action !== 'fallback' || !campaign.fallbackCampaignId) {
            return {
              isCapped: true,
              action: 'stop',
              cappedEntity: 'campaign',
              currentCount,
              limit,
              metric,
              resolvedVendorId,
              reason: 'LIMIT_REACHED',
            };
          }

          // Fallback requested on campaign:
          const fallbackCampaign = await getCampaignRepo().findOne({
            where: { id: Number(campaign.fallbackCampaignId) },
            relations: {
              marketOperator: { country: true },
              trackings: { vendor: true },
            },
          });

          if (!fallbackCampaign || !fallbackCampaign.active) {
            return {
              isCapped: true,
              action: 'stop',
              cappedEntity: 'campaign',
              currentCount,
              limit,
              metric,
              resolvedVendorId,
              reason: 'FALLBACK_CAMPAIGN_INACTIVE',
            };
          }

          // Check if target fallback campaign itself has reached its capping limit
          if (
            fallbackCampaign.cappingEnabled &&
            fallbackCampaign.cappingLimit != null
          ) {
            const targetLimit = Number(fallbackCampaign.cappingLimit);
            if (targetLimit > 0) {
              const targetInterval = fallbackCampaign.cappingInterval || 'daily';
              const targetMetric = String(
                fallbackCampaign.cappingMetric || 'conversions',
              ).toLowerCase();
              const targetCount =
                targetMetric === 'clicks'
                  ? await getCampaignClickCount(fallbackCampaign.id, targetInterval)
                  : await getCampaignConversionCount(
                      fallbackCampaign.id,
                      targetInterval,
                    );

              if (targetCount >= targetLimit) {
                return {
                  isCapped: true,
                  action: 'stop',
                  cappedEntity: 'campaign',
                  currentCount,
                  limit,
                  metric,
                  resolvedVendorId,
                  fallbackCampaignId: fallbackCampaign.id,
                  reason: 'FALLBACK_CAMPAIGN_CAPPED',
                };
              }
            }
          }

          // Check Vendor Assignment on Fallback Campaign
          if (!resolvedVendorId) {
            // No vendor assigned/found — redirecting would create an anonymous untracked click
            return {
              isCapped: true,
              action: 'stop',
              cappedEntity: 'campaign',
              currentCount,
              limit,
              metric,
              reason: 'VENDOR_NOT_FOUND',
            };
          }

          const assigned = await isVendorAssignedToCampaign(
            fallbackCampaign.id,
            resolvedVendorId,
          );
          if (!assigned) {
            return {
              isCapped: true,
              action: 'stop',
              cappedEntity: 'campaign',
              currentCount,
              limit,
              metric,
              resolvedVendorId,
              fallbackCampaignId: fallbackCampaign.id,
              reason: 'VENDOR_NOT_ASSIGNED',
            };
          }

          return {
            isCapped: true,
            action: 'fallback',
            cappedEntity: 'campaign',
            targetCampaign: fallbackCampaign,
            currentCount,
            limit,
            metric,
            resolvedVendorId,
          };
        }
      }
    }

    // 2. Evaluate Vendor Capping (if vendor is resolved and has cappingEnabled on CampaignTracking)
    if (resolvedVendorId) {
      const tracking = await getTrackingRepo().findOne({
        where: {
          campaignId: Number(campaign.id),
          vendorId: Number(resolvedVendorId),
          active: true,
        },
      });

      if (tracking && tracking.cappingEnabled) {
        const vLimit =
          tracking.cappingLimit != null ? Number(tracking.cappingLimit) : null;
        if (vLimit && vLimit > 0) {
          const vInterval = tracking.cappingInterval || 'daily';
          const vMetric = String(
            tracking.cappingMetric || 'conversions',
          ).toLowerCase();
          const currentVendorCount =
            vMetric === 'clicks'
              ? await getVendorClickCount(
                  campaign.id,
                  resolvedVendorId,
                  vInterval,
                )
              : await getVendorConversionCount(
                  campaign.id,
                  resolvedVendorId,
                  vInterval,
                );

          if (currentVendorCount >= vLimit) {
            // Vendor cap limit reached!
            const vAction = String(
              tracking.cappingAction || 'stop',
            ).toLowerCase();
            const targetFallbackId =
              tracking.fallbackCampaignId || campaign.fallbackCampaignId;

            if (vAction !== 'fallback' || !targetFallbackId) {
              return {
                isCapped: true,
                action: 'stop',
                cappedEntity: 'vendor',
                currentCount: currentVendorCount,
                limit: vLimit,
                metric: vMetric,
                resolvedVendorId,
                reason: 'VENDOR_LIMIT_REACHED',
              };
            }

            // Vendor Fallback requested:
            const fallbackCampaign = await getCampaignRepo().findOne({
              where: { id: Number(targetFallbackId) },
              relations: {
                marketOperator: { country: true },
                trackings: { vendor: true },
              },
            });

            if (!fallbackCampaign || !fallbackCampaign.active) {
              return {
                isCapped: true,
                action: 'stop',
                cappedEntity: 'vendor',
                currentCount: currentVendorCount,
                limit: vLimit,
                metric: vMetric,
                resolvedVendorId,
                reason: 'FALLBACK_CAMPAIGN_INACTIVE',
              };
            }

            const assigned = await isVendorAssignedToCampaign(
              fallbackCampaign.id,
              resolvedVendorId,
            );
            if (!assigned) {
              return {
                isCapped: true,
                action: 'stop',
                cappedEntity: 'vendor',
                currentCount: currentVendorCount,
                limit: vLimit,
                metric: vMetric,
                resolvedVendorId,
                fallbackCampaignId: fallbackCampaign.id,
                reason: 'VENDOR_NOT_ASSIGNED',
              };
            }

            return {
              isCapped: true,
              action: 'fallback',
              cappedEntity: 'vendor',
              targetCampaign: fallbackCampaign,
              currentCount: currentVendorCount,
              limit: vLimit,
              metric: vMetric,
              resolvedVendorId,
            };
          }
        }
      }
    }

    return { isCapped: false, action: 'allow', resolvedVendorId };
  };

  return {
    getCampaignClickCount,
    incrementCampaignClickCount,
    getCampaignConversionCount,
    incrementCampaignConversionCount,
    getVendorClickCount,
    incrementVendorClickCount,
    getVendorConversionCount,
    incrementVendorConversionCount,
    resolveVendorId,
    isVendorAssignedToCampaign,
    evaluateCapping,
  };
};

export const cappingService = createCappingService();
