import {
  withTrackingId,
  invalidateFlowCampaignCache,
  createCampaignApiConfigService,
  createCampaignPagesService,
  createCampaignCrudService,
  pageHasContent,
  sanitizeCampaignListItem,
} from './services/index.js';

export const createCampaignsService = (deps = {}) => {
  const pagesService = createCampaignPagesService(deps);

  const crudService = createCampaignCrudService({
    ...deps,
    pagesService,
    pageHasContent: pagesService.pageHasContent,
    sanitizeCampaignListItem: pagesService.sanitizeCampaignListItem,
    ensureCampaignPages: pagesService.ensureCampaignPages,
    ensureOrangeBfFlowGraph: pagesService.ensureOrangeBfFlowGraph,
    ensureFlowPages: pagesService.ensureFlowPages,
    defaultPageData: pagesService.defaultPageData,
  });

  const apiConfigService = createCampaignApiConfigService({
    ...deps,
    findOne: crudService.findOne,
  });

  return {
    // CRUD & queries
    findAll: (userId) => crudService.findAll(userId),
    findOne: (id, userId) => crudService.findOne(id, userId),
    assertOwnership: (id, userId) => crudService.assertOwnership(id, userId),
    findByCountryOperator: (country, operator) =>
      crudService.findByCountryOperator(country, operator),
    findByIdForFlow: (id) => crudService.findByIdForFlow(id),
    findByTrackingId: (countryCode, operatorCode, campaignId) =>
      crudService.findByTrackingId(countryCode, operatorCode, campaignId),
    create: (dto, userId) => crudService.create(dto, userId),
    update: (id, dto, userId) => crudService.update(id, dto, userId),
    remove: (id, userId) => crudService.remove(id, userId),
    getFlow: (id, userId) => crudService.getFlow(id, userId),
    updateFlow: (id, dto, userId) => crudService.updateFlow(id, dto, userId),
    serializeCampaign: (campaign, extras) =>
      crudService.serializeCampaign(campaign, extras),

    // Pages & templates
    ensureCampaignPages: (campaign) => pagesService.ensureCampaignPages(campaign),
    getPage: (campaignId, pageType, userId) =>
      pagesService.getPage(campaignId, pageType, userId),
    updatePageContent: (campaignId, pageType, dto, userId) =>
      pagesService.updatePageContent(campaignId, pageType, dto, userId),
    applyDefaultTemplates: (id, userId, onlyEmpty = true) =>
      pagesService.applyDefaultTemplates(id, userId, onlyEmpty, crudService.findOne),

    // API Config
    getApiConfig: (campaignId, userId) =>
      apiConfigService.getApiConfig(campaignId, userId),
    upsertApiConfig: (campaignId, payload, userId) =>
      apiConfigService.upsertApiConfig(campaignId, payload, userId),

    // Utils & caching
    pageHasContent,
    sanitizeCampaignListItem,
    withTrackingId,
    invalidateFlowCampaignCache,
  };
};

export const campaignsService = createCampaignsService();
