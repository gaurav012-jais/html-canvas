import { getRepository } from '../../database/index.js';
import { Campaign } from '../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../database/entities/campaign-tracking.entity.js';
import { partnersService } from '../partners/partners.service.js';
import {
  getZonedDateParts,
  getMondayYmd,
  getPeriodMetadata,
  getVendorPeriodMetadata,
} from './services/capping-interval.util.js';
import { createCappingCountsService } from './services/capping-counts.service.js';

export {
  getZonedDateParts,
  getMondayYmd,
  getPeriodMetadata,
  getVendorPeriodMetadata,
};

export const createCappingService = () => {
  const getCampaignRepo = () => getRepository(Campaign);
  const getTrackingRepo = () => getRepository(CampaignTracking);
  const countsService = createCappingCountsService();

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
            ? await countsService.getCampaignClickCount(campaign.id, interval)
            : await countsService.getCampaignConversionCount(campaign.id, interval);

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
                  ? await countsService.getCampaignClickCount(fallbackCampaign.id, targetInterval)
                  : await countsService.getCampaignConversionCount(
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
              ? await countsService.getVendorClickCount(
                  campaign.id,
                  resolvedVendorId,
                  vInterval,
                )
              : await countsService.getVendorConversionCount(
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
    ...countsService,
    resolveVendorId,
    isVendorAssignedToCampaign,
    evaluateCapping,
  };
};

export const cappingService = createCappingService();
