import { redisService } from '../../../common/services/redis.service.js';
import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { buildTrackingId } from '../../markets/helpers/tracking-id.util.js';

export const withTrackingId = (campaign) => {
  if (!campaign) return campaign;
  const cc = campaign.marketOperator?.country?.code;
  const oc = campaign.marketOperator?.code;
  if (cc && oc) {
    campaign.trackingId = buildTrackingId(cc, oc, campaign.id);
  }
  return campaign;
};

/**
 * Invalidates Redis cache entries for a campaign by ID, country-operator pair, and tracking ID.
 *
 * @param {Object|number|string} campaignOrPartial
 */
export const invalidateFlowCampaignCache = async (campaignOrPartial) => {
  if (!campaignOrPartial) return;

  let campaign = campaignOrPartial;
  const isIdOnly =
    typeof campaignOrPartial === 'number' ||
    typeof campaignOrPartial === 'string';

  const id = isIdOnly
    ? parseInt(campaignOrPartial, 10)
    : campaign?.id
      ? parseInt(campaign.id, 10)
      : null;

  if (!id || Number.isNaN(id)) return;

  if (
    isIdOnly ||
    !campaign?.country ||
    !campaign?.operator ||
    !campaign?.trackingId
  ) {
    try {
      const campaignRepo = getRepository(Campaign);
      const found = await campaignRepo.findOne({
        where: { id },
        relations: {
          marketOperator: { country: true },
        },
      });
      if (found) {
        campaign = found;
        withTrackingId(campaign);
      }
    } catch (err) {
      console.warn(
        'Failed to load campaign for cache invalidation:',
        err?.message || err,
      );
    }
  } else if (campaign?.id && !campaign.trackingId) {
    withTrackingId(campaign);
  }

  const cc1 = campaign?.country ? String(campaign.country).toLowerCase() : '';
  const oc1 = campaign?.operator ? String(campaign.operator).toLowerCase() : '';
  const cc2 = campaign?.marketOperator?.country?.name
    ? String(campaign.marketOperator.country.name).toLowerCase()
    : '';
  const oc2 = campaign?.marketOperator?.name
    ? String(campaign.marketOperator.name).toLowerCase()
    : '';
  const cc3 = campaign?.marketOperator?.country?.code
    ? String(campaign.marketOperator.country.code).toLowerCase()
    : '';
  const oc3 = campaign?.marketOperator?.code
    ? String(campaign.marketOperator.code).toLowerCase()
    : '';

  const keys = [
    `flow:campaign:id:${id}`,
    `flow:config:${id}`,
    campaign?.trackingId ? `flow:campaign:id:${campaign.trackingId}` : null,
    cc1 && oc1 ? `flow:campaign:co:${cc1}:${oc1}` : null,
    cc2 && oc2 ? `flow:campaign:co:${cc2}:${oc2}` : null,
    cc3 && oc3 ? `flow:campaign:co:${cc3}:${oc3}` : null,
    cc1 && oc3 ? `flow:campaign:co:${cc1}:${oc3}` : null,
    cc3 && oc1 ? `flow:campaign:co:${cc3}:${oc1}` : null,
  ].filter(Boolean);

  const uniqueKeys = Array.from(new Set(keys));

  try {
    await Promise.all(uniqueKeys.map((k) => redisService.del(k)));
    if (typeof redisService.deletePattern === 'function') {
      await Promise.all([
        redisService.deletePattern(`flow:campaign:id:${id}*`).catch(() => {}),
        campaign?.trackingId
          ? redisService
              .deletePattern(`flow:campaign:id:${campaign.trackingId}*`)
              .catch(() => {})
          : Promise.resolve(),
      ]);
    }
  } catch (err) {
    console.warn('invalidateFlowCampaignCache error:', err?.message || err);
  }
};
