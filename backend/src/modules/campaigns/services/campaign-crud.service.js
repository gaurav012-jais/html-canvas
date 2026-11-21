import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import {
  ALL_CAMPAIGN_PAGE_TYPES,
  CampaignPage,
  REQUIRED_CAMPAIGN_PAGE_TYPES,
} from '../../../database/entities/campaign-page.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { Template } from '../../../database/entities/template.entity.js';
import { flowEngineService } from '../../flow/core/engine.js';
import { marketsService } from '../../markets/markets.service.js';
import {
  deriveCountryCode,
  deriveOperatorCode,
} from '../../markets/helpers/tracking-id.util.js';
import { parsePayoutPercent } from '../../otp/helpers/payout.js';
import {
  withTrackingId,
  invalidateFlowCampaignCache,
} from './campaign-cache.service.js';

export const createCampaignCrudService = (deps = {}) => {
  const getCampaignRepo = () => deps.campaignRepo || getRepository(Campaign);
  const getCampaignPageRepo = () =>
    deps.campaignPageRepo || getRepository(CampaignPage);
  const getTemplateRepo = () => deps.templateRepo || getRepository(Template);
  const getTrackingRepo = () =>
    deps.trackingRepo || getRepository(CampaignTracking);

  const normalize = (value) => String(value || '').trim();

  const pagesService = deps.pagesService;
  const pageHasContent =
    deps.pageHasContent || pagesService?.pageHasContent || (() => false);
  const sanitizeCampaignListItem =
    deps.sanitizeCampaignListItem ||
    pagesService?.sanitizeCampaignListItem ||
    ((c) => c);
  const ensureCampaignPages =
    deps.ensureCampaignPages ||
    pagesService?.ensureCampaignPages ||
    (async () => {});
  const ensureOrangeBfFlowGraph =
    deps.ensureOrangeBfFlowGraph ||
    pagesService?.ensureOrangeBfFlowGraph ||
    (async () => false);
  const ensureFlowPages =
    deps.ensureFlowPages || pagesService?.ensureFlowPages || (async () => {});
  const defaultPageData =
    deps.defaultPageData || pagesService?.defaultPageData || (() => ({}));

  /** Persist campaign columns only — never cascade to trackings/pages. */
  const persistCampaign = async (campaign) => {
    const trackings = campaign.trackings;
    const pages = campaign.pages;
    const marketOperator = campaign.marketOperator;
    const user = campaign.user;
    delete campaign.trackings;
    delete campaign.pages;
    delete campaign.marketOperator;
    delete campaign.user;
    try {
      return await getCampaignRepo().save(campaign);
    } finally {
      campaign.trackings = trackings;
      campaign.pages = pages;
      campaign.marketOperator = marketOperator;
      campaign.user = user;
    }
  };

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

  const create = async (dto, userId) => {
    const { country, operator } = await marketsService.resolveOperatorForCreate(
      {
        userId,
        operatorId: dto.operatorId,
        countryCode:
          dto.countryCode ||
          (dto.country ? deriveCountryCode(dto.country) : undefined),
        operatorCode:
          dto.operatorCode ||
          (dto.operator ? deriveOperatorCode(dto.operator) : undefined),
        countryName: dto.country,
        operatorName: dto.operator,
      },
    );

    const countryName = normalize(dto.country || country.name);
    const operatorName = normalize(dto.operator || operator.name);

    const nameConflict = await getCampaignRepo().findOne({
      where: { operatorId: operator.id, name: dto.name.trim() },
    });
    if (nameConflict) {
      const err = new Error(
        `Campaign "${dto.name.trim()}" already exists for ${country.code} / ${operator.code}`,
      );
      err.statusCode = 409;
      throw err;
    }

    let sourcePages = [];
    if (dto.copyFromCampaignId) {
      const source = await getCampaignRepo().findOne({
        where: { id: parseInt(dto.copyFromCampaignId, 10), userId },
        relations: { pages: { template: true } },
      });
      if (!source) {
        const err = new Error(
          `Source campaign ${dto.copyFromCampaignId} not found`,
        );
        err.statusCode = 404;
        throw err;
      }
      sourcePages = source.pages || [];
    }

    const defaultMode = 'BOTH';
    const campaign = await getCampaignRepo().save(
      getCampaignRepo().create({
        name: dto.name.trim(),
        country: countryName,
        operator: operatorName,
        operatorId: operator.id,
        serviceId: dto.serviceId,
        userId,
        active: false,
        verificationMode: defaultMode,
        flowConfig: JSON.stringify(
          flowEngineService.getDefaultFlowConfig(defaultMode),
        ),
      }),
    );

    for (const pageType of ALL_CAMPAIGN_PAGE_TYPES) {
      const sourcePage = sourcePages.find((p) => p.pageType === pageType);
      let template;

      if (sourcePage?.template) {
        template = await getTemplateRepo().save(
          getTemplateRepo().create({
            name: `${campaign.name} - ${pageType}`,
            data: { ...sourcePage.template.data },
            userId,
            isPrebuilt: false,
          }),
        );
      } else {
        template = await getTemplateRepo().save(
          getTemplateRepo().create({
            name: `${campaign.name} - ${pageType}`,
            data: defaultPageData(pageType, campaign),
            userId,
            isPrebuilt: false,
          }),
        );
      }

      await getCampaignPageRepo().save(
        getCampaignPageRepo().create({
          campaignId: campaign.id,
          pageType,
          templateId: template.id,
        }),
      );
    }

    return sanitizeCampaignListItem(await findOne(campaign.id, userId));
  };

  const update = async (id, dto, userId) => {
    const campaign = await findOne(id, userId);

    if (dto.active === true) {
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
    }

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
    if (dto.trackings !== undefined) {
      await getTrackingRepo().delete({ campaignId: campaign.id });
      if (dto.trackings && dto.trackings.length > 0) {
        await getTrackingRepo().insert(
          dto.trackings.map((t) => ({
            campaignId: campaign.id,
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
      await getTrackingRepo().delete({ campaignId: campaign.id });
      if (dto.vendorIds && dto.vendorIds.length > 0) {
        await getTrackingRepo().insert(
          dto.vendorIds.map((vid) => ({
            campaignId: campaign.id,
            vendorId: Number(vid),
            affiliateId: null,
            active: true,
          })),
        );
      }
    }

    delete campaign.trackings;
    await persistCampaign(campaign);
    const refreshed = sanitizeCampaignListItem(await findOne(id, userId));
    await invalidateFlowCampaignCache(refreshed);
    return refreshed;
  };

  const getFlow = async (id, userId) => {
    const campaign = await findOne(id, userId);
    const mode =
      flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
    const flowConfig =
      flowEngineService.parseFlowConfig(campaign.flowConfig) ||
      flowEngineService.getDefaultFlowConfig(mode, {
        funnelLayout: campaign.funnelLayout,
      });
    return { verificationMode: mode, flowConfig };
  };

  const updateFlow = async (id, dto, userId) => {
    const campaign = await findOne(id, userId);

    const mode =
      flowEngineService.normalizeMode(dto.verificationMode) ||
      flowEngineService.normalizeMode(campaign.verificationMode) ||
      'BOTH';

    let flowConfig;
    if (dto.flowConfig) {
      flowConfig = flowEngineService.stripUnreachableNodes(
        dto.flowConfig,
        mode,
      );
      const { ok, errors } = flowEngineService.validate(flowConfig, mode);
      if (!ok) {
        const err = new Error(`Invalid flow: ${errors.join(' ')}`);
        err.statusCode = 400;
        throw err;
      }
    } else {
      flowConfig =
        flowEngineService.parseFlowConfig(campaign.flowConfig) ||
        flowEngineService.getDefaultFlowConfig(mode, {
          funnelLayout: campaign.funnelLayout,
        });
    }

    campaign.verificationMode = mode;
    flowConfig.entryPage = flowEngineService.getEntryPage(flowConfig);
    campaign.flowConfig = JSON.stringify(flowConfig);
    await persistCampaign(campaign);
    await ensureFlowPages(campaign);
    await invalidateFlowCampaignCache(campaign);
    return { verificationMode: mode, flowConfig };
  };

  const remove = async (id, userId) => {
    const campaign = await findOne(id, userId);
    campaign.active = false;
    await persistCampaign(campaign);
    await invalidateFlowCampaignCache(campaign);
  };

  const serializeCampaign = (campaign, extras = {}) => {
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

  return {
    persistCampaign,
    findAll,
    assertOwnership,
    findOne,
    findByCountryOperator,
    findByIdForFlow,
    findByTrackingId,
    create,
    update,
    getFlow,
    updateFlow,
    remove,
    serializeCampaign,
  };
};
