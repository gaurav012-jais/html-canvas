import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import {
  ALL_CAMPAIGN_PAGE_TYPES,
  CampaignPage,
  CampaignPageType,
} from '../../../database/entities/campaign-page.entity.js';
import { Template } from '../../../database/entities/template.entity.js';
import {
  getDefaultFunnelPageData,
  isClassicDefaultFunnelHtml,
} from '../../../database/seed/default-funnel-pages.js';
import { flowEngineService } from '../../flow/flow-engine.service.js';
import { invalidateFlowCampaignCache } from './campaign-cache.service.js';

export const pageHasContent = (page) => {
  const html = page.template?.data?.html;
  return typeof html === 'string' && html.trim().length > 0;
};

export const sanitizeCampaignListItem = (campaign) => {
  if (campaign?.pages) {
    campaign.pages = campaign.pages.map((page) => {
      if (page.template?.data) {
        page.template.data = {
          ...page.template.data,
          projectData: undefined,
          html: page.template.data.html ? '[saved]' : '',
          css: page.template.data.css ? '[saved]' : '',
        };
      }
      return page;
    });
  }
  return campaign;
};

export const defaultPageData = (pageType, campaign) =>
  getDefaultFunnelPageData(pageType, {
    verificationMode: campaign?.verificationMode,
  });

export const isDefaultTemplateHtml = (pageType, html) => {
  const source = String(html || '').trim();
  if (!source) return true;
  if (isClassicDefaultFunnelHtml(pageType, source)) return true;
  if (
    source.includes('bf-wellness-container') ||
    source.includes('WELLNESS360')
  )
    return true;
  if (
    source.includes('dcb-home') ||
    source.includes('dcb-otp') ||
    source.includes('data-dcb-action')
  )
    return true;
  if (
    source.includes('he-page') ||
    source.includes('otp-flow-page') ||
    source.includes('both-flow-page') ||
    source.includes('cg-flow-page') ||
    source.includes('none-flow-page')
  )
    return true;
  if (
    source.includes('Premium Mobile Service') ||
    source.includes('Verify Mobile Number') ||
    source.includes("You're Subscribed!")
  )
    return true;
  return false;
};

export const createCampaignPagesService = (deps = {}) => {
  const getCampaignRepo = () => deps.campaignRepo || getRepository(Campaign);
  const getCampaignPageRepo = () =>
    deps.campaignPageRepo || getRepository(CampaignPage);
  const getTemplateRepo = () => deps.templateRepo || getRepository(Template);

  const ensureOrangeBfFlowGraph = async (campaign) => {
    const mode = flowEngineService.normalizeMode(campaign.verificationMode);
    if (mode !== 'ORANGE_BF') return false;
    const parsedFlow = flowEngineService.parseFlowConfig(campaign.flowConfig);
    if (
      parsedFlow &&
      parsedFlow.nodes?.some((n) => n.pageType === CampaignPageType.CONFIRM) &&
      parsedFlow.edges?.some(
        (e) => e.source === 'HOME' && e.target === 'CONFIRM',
      )
    ) {
      return false;
    }
    campaign.flowConfig = JSON.stringify(
      flowEngineService.getDefaultFlowConfig('ORANGE_BF'),
    );
    await getCampaignRepo().update(
      { id: campaign.id },
      { flowConfig: campaign.flowConfig },
    );
    return true;
  };

  const ensureFlowPages = async (campaign) => {
    let changed = await ensureOrangeBfFlowGraph(campaign);

    for (const page of campaign.pages || []) {
      if (!page.templateId) continue;

      const template =
        page.template ||
        (await getTemplateRepo().findOne({
          where: { id: page.templateId },
        }));
      if (!template) continue;

      const html = template.data?.html || '';
      const isDefault = isDefaultTemplateHtml(page.pageType, html);

      if (isDefault) {
        const newData = defaultPageData(page.pageType, campaign);
        if (newData && newData.html && template.data?.html !== newData.html) {
          template.data = newData;
          await getTemplateRepo().save(template);
          page.template = template;
          changed = true;
        }
      }
    }

    if (changed) await invalidateFlowCampaignCache(campaign);
    return changed;
  };

  const ensureCampaignPages = async (campaign) => {
    const existingPageTypes = new Set(
      (campaign.pages || []).map((p) => p.pageType),
    );

    // Fast return if all pages already exist
    if (existingPageTypes.size >= ALL_CAMPAIGN_PAGE_TYPES.length) {
      return;
    }

    let inserted = false;
    for (const pageType of ALL_CAMPAIGN_PAGE_TYPES) {
      if (!existingPageTypes.has(pageType)) {
        try {
          const template = await getTemplateRepo().save(
            getTemplateRepo().create({
              name: `${campaign.name} - ${pageType}`,
              data: defaultPageData(pageType, campaign),
              userId: campaign.userId,
              isPrebuilt: false,
            }),
          );

          const newPage = await getCampaignPageRepo().save(
            getCampaignPageRepo().create({
              campaignId: campaign.id,
              pageType,
              templateId: template.id,
            }),
          );

          newPage.template = template;
          if (!campaign.pages) {
            campaign.pages = [];
          }
          campaign.pages.push(newPage);
          inserted = true;
        } catch (err) {
          const dbPage = await getCampaignPageRepo().findOne({
            where: { campaignId: campaign.id, pageType },
            relations: { template: true },
          });
          if (dbPage) {
            if (!campaign.pages) {
              campaign.pages = [];
            }
            campaign.pages.push(dbPage);
          }
        }
      }
    }

    if (inserted) {
      await ensureFlowPages(campaign);
    }
  };

  const getPage = async (campaignId, pageType, userId) => {
    // Use unsanitized campaign so editor gets real html/css/projectData
    const campaign = await getCampaignRepo().findOne({
      where: { id: parseInt(campaignId, 10) },
      relations: {
        pages: { template: true },
        marketOperator: { country: true },
      },
    });
    if (!campaign) {
      const err = new Error(`Campaign with ID ${campaignId} not found`);
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

    const normalizedType = String(pageType || '')
      .trim()
      .toUpperCase();
    if (!ALL_CAMPAIGN_PAGE_TYPES.includes(normalizedType)) {
      const err = new Error(`Invalid page type "${pageType}"`);
      err.statusCode = 400;
      throw err;
    }

    const page = (campaign.pages || []).find(
      (p) => p.pageType === normalizedType,
    );
    if (!page) {
      const err = new Error(`Page type ${pageType} not found for campaign`);
      err.statusCode = 404;
      throw err;
    }

    if (!page.template && page.templateId) {
      const template = await getTemplateRepo().findOne({
        where: { id: page.templateId },
      });
      if (template) page.template = template;
    }

    return page;
  };

  const updatePageContent = async (campaignId, pageType, dto, userId) => {
    const normalizedType = String(pageType || '')
      .trim()
      .toUpperCase();
    if (!ALL_CAMPAIGN_PAGE_TYPES.includes(normalizedType)) {
      const err = new Error(`Invalid page type "${pageType}"`);
      err.statusCode = 400;
      throw err;
    }
    const page = await getPage(campaignId, normalizedType, userId);
    if (!page.templateId) {
      const err = new Error('Template not linked to this page');
      err.statusCode = 404;
      throw err;
    }

    const template =
      page.template ||
      (await getTemplateRepo().findOne({
        where: { id: page.templateId },
      }));
    if (!template) {
      const err = new Error('Template not found');
      err.statusCode = 404;
      throw err;
    }

    const data = { ...(template.data || {}) };
    if (dto.projectData !== undefined) data.projectData = dto.projectData;
    if (dto.html !== undefined) data.html = dto.html;
    if (dto.css !== undefined) data.css = dto.css;
    data.editor = 'grapesjs';

    template.data = data;
    await getTemplateRepo().save(template);

    page.template = template;
    page.updatedAt = new Date();
    await getCampaignPageRepo().save(page);

    await invalidateFlowCampaignCache(campaignId);

    return page;
  };

  const applyDefaultTemplates = async (
    id,
    userId,
    onlyEmpty = true,
    findOneFn,
  ) => {
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

    for (const page of campaign.pages || []) {
      const hasContent = pageHasContent(page);
      if (onlyEmpty && hasContent) continue;
      if (!page.templateId) continue;

      const template =
        page.template ||
        (await getTemplateRepo().findOne({
          where: { id: page.templateId },
        }));
      if (!template) continue;

      template.data = defaultPageData(page.pageType, campaign);
      await getTemplateRepo().save(template);
      page.template = template;
    }

    await invalidateFlowCampaignCache(campaign);
    if (findOneFn) {
      return findOneFn(id, userId);
    }
    return campaign;
  };

  return {
    ensureOrangeBfFlowGraph,
    ensureFlowPages,
    ensureCampaignPages,
    getPage,
    updatePageContent,
    applyDefaultTemplates,
    pageHasContent,
    sanitizeCampaignListItem,
    defaultPageData,
    isDefaultTemplateHtml,
  };
};
