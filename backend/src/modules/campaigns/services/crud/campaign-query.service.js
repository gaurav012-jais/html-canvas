import { withTrackingId, invalidateFlowCampaignCache } from '../campaign-cache.service.js';

export const normalize = (value) => String(value || '').trim();

export const serializeCampaign = (campaign, extras = {}) => {
  if (!campaign) return null;
  const flowConfig =
    extras.flowConfig !== undefined ? extras.flowConfig : campaign.flowConfig;
  return {
    id: campaign.id,
    name: campaign.name,
    country: campaign.country,
    operator: campaign.operator,
    operatorId: campaign.operatorId,
    serviceId: campaign.serviceId,
    active: campaign.active,
    userId: campaign.userId,
    verificationMode: extras.verificationMode ?? campaign.verificationMode,
    flowConfig:
      flowConfig && typeof flowConfig !== 'string'
        ? JSON.stringify(flowConfig)
        : flowConfig,
    cgRedirectUrl: campaign.cgRedirectUrl,
    successRedirectUrl: campaign.successRedirectUrl,
    successRedirectMode: campaign.successRedirectMode,
    postbackRegisterAt: campaign.postbackRegisterAt,
    funnelLayout: campaign.funnelLayout,
    allowedCallbackStatuses: campaign.allowedCallbackStatuses || null,
    cappingEnabled: Boolean(campaign.cappingEnabled),
    cappingMetric: campaign.cappingMetric || 'conversions',
    cappingLimit:
      campaign.cappingLimit != null ? Number(campaign.cappingLimit) : null,
    cappingAction: campaign.cappingAction || 'stop',
    fallbackCampaignId:
      campaign.fallbackCampaignId != null
        ? Number(campaign.fallbackCampaignId)
        : null,
    cappingInterval: campaign.cappingInterval || 'daily',
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    pages: campaign.pages || [],
    trackings: campaign.trackings || [],
    marketOperator: campaign.marketOperator || null,
    trackingId: campaign.trackingId,
  };
};

export const createCampaignQueryService = (deps = {}) => {
  const getCampaignRepo = deps.getCampaignRepo;
  const sanitizeCampaignListItem =
    deps.sanitizeCampaignListItem || ((c) => c);
  const ensureCampaignPages = deps.ensureCampaignPages || (async () => {});
  const ensureOrangeBfFlowGraph =
    deps.ensureOrangeBfFlowGraph || (async () => false);

  const findAll = async (userId) => {
    const campaigns = await getCampaignRepo().find({
      where: { userId },
      relations: {
        pages: { template: true },
        trackings: { vendor: true },
        marketOperator: { country: true },
      },
      order: { updatedAt: 'DESC' },
    });
    return campaigns.map((c) => sanitizeCampaignListItem(withTrackingId(c)));
  };

  const assertOwnership = async (id, userId) => {
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(id, 10) },
      select: { id: true, name: true, userId: true },
    });
    if (!campaign) {
      const err = new Error(`Campaign with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (campaign.userId !== userId) {
      const err = new Error(
        'You do not have permission to access this campaign',
      );
      err.statusCode = 403;
      throw err;
    }
    return campaign;
  };

  const findOne = async (id, userId) => {
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(id, 10) },
      relations: {
        pages: { template: true },
        trackings: { vendor: true },
        marketOperator: { country: true },
      },
    });
    if (!campaign) {
      const err = new Error(`Campaign with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (campaign.userId !== userId) {
      const err = new Error(
        'You do not have permission to access this campaign',
      );
      err.statusCode = 403;
      throw err;
    }
    await ensureCampaignPages(campaign);
    return sanitizeCampaignListItem(withTrackingId(campaign));
  };

  const findByCountryOperator = async (country, operator) => {
    const normalizedCountry = normalize(country);
    const normalizedOperator = normalize(operator);

    const campaigns = await getCampaignRepo()
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.pages', 'pages')
      .leftJoinAndSelect('pages.template', 'template')
      .leftJoinAndSelect('campaign.trackings', 'trackings')
      .leftJoinAndSelect('trackings.vendor', 'vendor')
      .leftJoinAndSelect('campaign.marketOperator', 'marketOperator')
      .leftJoinAndSelect('marketOperator.country', 'marketCountry')
      .where('LOWER(campaign.country) = LOWER(:country)', {
        country: normalizedCountry,
      })
      .andWhere('LOWER(campaign.operator) = LOWER(:operator)', {
        operator: normalizedOperator,
      })
      .getMany();

    if (campaigns.length === 0) return null;

    let campaign = null;
    if (campaigns.length === 1) {
      campaign = campaigns[0];
    } else {
      const actives = campaigns.filter((c) => c.active);
      if (actives.length === 1) {
        campaign = actives[0];
      } else if (actives.length > 1) {
        campaign = [...actives].sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime(),
        )[0];
      } else {
        campaign = [...campaigns].sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime(),
        )[0];
      }
    }

    if (campaign) {
      await ensureCampaignPages(campaign);
      return withTrackingId(campaign);
    }
    return null;
  };

  const findByIdForFlow = async (id) => {
    if (!id || Number.isNaN(Number(id))) return null;
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(id, 10) },
      relations: {
        pages: { template: true },
        trackings: { vendor: true },
        marketOperator: { country: true },
      },
    });
    if (campaign) {
      await ensureCampaignPages(campaign);
      if (await ensureOrangeBfFlowGraph(campaign)) {
        await invalidateFlowCampaignCache(campaign);
      }
      return withTrackingId(campaign);
    }
    return null;
  };

  const findByTrackingId = async (countryCode, operatorCode, campaignId) => {
    const campaign = await findByIdForFlow(campaignId);
    if (!campaign) return null;
    const cc = campaign.marketOperator?.country?.code?.toUpperCase();
    const oc = campaign.marketOperator?.code?.toUpperCase();
    if (cc && oc) {
      if (
        cc !== countryCode.toUpperCase() ||
        oc !== operatorCode.toUpperCase()
      ) {
        return null;
      }
    }
    return campaign;
  };

  return {
    findAll,
    assertOwnership,
    findOne,
    findByCountryOperator,
    findByIdForFlow,
    findByTrackingId,
    serializeCampaign,
  };
};
