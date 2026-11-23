import { REQUIRED_CAMPAIGN_PAGE_TYPES } from '../../../../database/entities/campaign-page.entity.js';
import { flowEngineService } from '../../../flow/core/engine.js';
import { parsePayoutPercent } from '../../../otp/helpers/payout.js';

export const persistCampaign = async (campaign, getCampaignRepo) => {
  const trackings = campaign.trackings;
  const pages = campaign.pages;
  const marketOperator = campaign.marketOperator;
  const user = campaign.user;
  delete campaign.trackings;
  delete campaign.pages;
  delete campaign.marketOperator;
  delete campaign.user;
  try {
    const repo =
      typeof getCampaignRepo === 'function' ? getCampaignRepo() : getCampaignRepo;
    return await repo.save(campaign);
  } finally {
    campaign.trackings = trackings;
    campaign.pages = pages;
    campaign.marketOperator = marketOperator;
    campaign.user = user;
  }
};

export const validateActivation = (campaign, dto, pageHasContent) => {
  if (dto.active !== true) return;
  const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
  const requiredTypes =
    flowConfig && flowConfig.nodes
      ? flowConfig.nodes.map((n) => n.pageType)
      : REQUIRED_CAMPAIGN_PAGE_TYPES;

  const missing = requiredTypes.filter((type) => {
    const page = campaign.pages.find((p) => p.pageType === type);
    return !page || !pageHasContent(page);
  });
  if (missing.length > 0) {
    const err = new Error(
      `Cannot activate campaign. Missing content for: ${missing.join(', ')}`,
    );
    err.statusCode = 400;
    throw err;
  }
};

export const applyDtoToCampaign = (campaign, dto) => {
  if (dto.name !== undefined) campaign.name = dto.name.trim();
  if (dto.serviceId !== undefined) campaign.serviceId = dto.serviceId;
  if (dto.cgRedirectUrl !== undefined) {
    campaign.cgRedirectUrl = dto.cgRedirectUrl?.trim() || null;
  }
  if (dto.successRedirectUrl !== undefined) {
    campaign.successRedirectUrl = dto.successRedirectUrl?.trim() || null;
  }
  if (dto.successRedirectMode !== undefined) {
    const mode = String(dto.successRedirectMode || '')
      .trim()
      .toLowerCase();
    campaign.successRedirectMode =
      mode === 'immediate' ? 'immediate' : 'thankyou';
  }
  if (dto.postbackRegisterAt !== undefined) {
    const mode = String(dto.postbackRegisterAt || '')
      .trim()
      .toLowerCase();
    campaign.postbackRegisterAt =
      mode === 'otp' || mode === 'both' ? mode : 'confirm';
  }
  if (dto.funnelLayout !== undefined) {
    const layout = String(dto.funnelLayout || '')
      .trim()
      .toLowerCase();
    const nextLayout =
      layout === 'packs_on_home' ? 'packs_on_home' : 'classic';
    campaign.funnelLayout = nextLayout;
    if (
      nextLayout === 'packs_on_home' &&
      campaign.postbackRegisterAt === 'otp'
    ) {
      campaign.postbackRegisterAt = 'confirm';
    }
    const parsed = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (parsed) {
      campaign.flowConfig = JSON.stringify(
        flowEngineService.applyFunnelLayoutToFlowConfig(
          parsed,
          nextLayout,
          campaign.verificationMode,
        ),
      );
    }
  }
  if (dto.active !== undefined) campaign.active = dto.active;
  if (dto.allowedCallbackStatuses !== undefined) {
    campaign.allowedCallbackStatuses =
      typeof dto.allowedCallbackStatuses === 'string'
        ? dto.allowedCallbackStatuses.trim() || null
        : null;
  }
  if (dto.cappingEnabled !== undefined) {
    campaign.cappingEnabled = Boolean(dto.cappingEnabled);
  }
  if (dto.cappingMetric !== undefined) {
    const metric = String(dto.cappingMetric || '')
      .trim()
      .toLowerCase();
    campaign.cappingMetric = metric === 'clicks' ? 'clicks' : 'conversions';
  }
  if (dto.cappingLimit !== undefined) {
    campaign.cappingLimit =
      dto.cappingLimit !== null && dto.cappingLimit !== ''
        ? parseInt(dto.cappingLimit, 10)
        : null;
  }
  if (dto.cappingAction !== undefined) {
    const action = String(dto.cappingAction || '')
      .trim()
      .toLowerCase();
    campaign.cappingAction = action === 'fallback' ? 'fallback' : 'stop';
  }
  if (dto.fallbackCampaignId !== undefined) {
    campaign.fallbackCampaignId =
      dto.fallbackCampaignId !== null && dto.fallbackCampaignId !== ''
        ? parseInt(dto.fallbackCampaignId, 10)
        : null;
  }
  if (dto.cappingInterval !== undefined) {
    const interval = String(dto.cappingInterval || '')
      .trim()
      .toLowerCase();
    campaign.cappingInterval = interval === 'total' ? 'total' : 'daily';
  }
};

export const syncCampaignTrackings = async (campaignId, dto, getTrackingRepo) => {
  if (dto.trackings !== undefined) {
    await getTrackingRepo().delete({ campaignId });
    if (dto.trackings && dto.trackings.length > 0) {
      await getTrackingRepo().insert(
        dto.trackings.map((t) => ({
          campaignId,
          vendorId: Number(t.vendorId),
          affiliateId: null,
          active:
            t.active === undefined || t.active === null ? true : !!t.active,
          payoutPercent: parsePayoutPercent(t.payoutPercent),
          allowedCallbackStatuses:
            typeof t.allowedCallbackStatuses === 'string'
              ? t.allowedCallbackStatuses.trim() || null
              : null,
          cappingEnabled: Boolean(t.cappingEnabled),
          cappingMetric:
            String(t.cappingMetric || '').toLowerCase() === 'clicks'
              ? 'clicks'
              : 'conversions',
          cappingLimit:
            t.cappingLimit != null && t.cappingLimit !== ''
              ? parseInt(t.cappingLimit, 10)
              : null,
          cappingAction:
            String(t.cappingAction || '').toLowerCase() === 'fallback'
              ? 'fallback'
              : 'stop',
          cappingInterval: ['daily', 'weekly', 'monthly', 'total'].includes(
            String(t.cappingInterval || '').toLowerCase(),
          )
            ? String(t.cappingInterval).toLowerCase()
            : 'daily',
          fallbackCampaignId:
            t.fallbackCampaignId != null && t.fallbackCampaignId !== ''
              ? parseInt(t.fallbackCampaignId, 10)
              : null,
        })),
      );
    }
  } else if (dto.vendorIds !== undefined) {
    await getTrackingRepo().delete({ campaignId });
    if (dto.vendorIds && dto.vendorIds.length > 0) {
      await getTrackingRepo().insert(
        dto.vendorIds.map((vid) => ({
          campaignId,
          vendorId: Number(vid),
          affiliateId: null,
          active: true,
        })),
      );
    }
  }
};
