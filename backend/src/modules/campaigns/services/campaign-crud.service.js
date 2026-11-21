/**
 * Campaign CRUD Service (Facade)
 *
 * Safe, backward-compatible Facade delegating to specialized CRUD sub-modules:
 * - crud/campaign-query.service: Lookup by ID, country/operator, trackingId & ownership guards
 * - crud/campaign-create.helper: Operator resolution, name collision checks & template/page provisioning
 * - crud/campaign-update.helper: Property mutation, activation validation, and vendor tracking sync
 * - crud/campaign-flow-ops.helper: Visual flow diagram verification, validation & page synchronization
 */

import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { CampaignPage } from '../../../database/entities/campaign-page.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { Template } from '../../../database/entities/template.entity.js';
import { invalidateFlowCampaignCache } from './campaign-cache.service.js';
import {
  createCampaignQueryService,
  serializeCampaign,
  normalize,
} from './crud/campaign-query.service.js';
import { createCampaignWithPages } from './crud/campaign-create.helper.js';
import {
  persistCampaign as persistCampaignHelper,
  validateActivation,
  applyDtoToCampaign,
  syncCampaignTrackings,
} from './crud/campaign-update.helper.js';
import {
  getCampaignFlow,
  updateCampaignFlow,
} from './crud/campaign-flow-ops.helper.js';

export { serializeCampaign, normalize };

export const createCampaignCrudService = (deps = {}) => {
  const getCampaignRepo = () => deps.campaignRepo || getRepository(Campaign);
  const getCampaignPageRepo = () =>
    deps.campaignPageRepo || getRepository(CampaignPage);
  const getTemplateRepo = () => deps.templateRepo || getRepository(Template);
  const getTrackingRepo = () =>
    deps.trackingRepo || getRepository(CampaignTracking);

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

  const queryService = createCampaignQueryService({
    getCampaignRepo,
    sanitizeCampaignListItem,
    ensureCampaignPages,
    ensureOrangeBfFlowGraph,
  });

  const persistCampaign = (campaign) =>
    persistCampaignHelper(campaign, getCampaignRepo());

  const create = async (dto, userId) =>
    createCampaignWithPages(dto, userId, {
      getCampaignRepo,
      getCampaignPageRepo,
      getTemplateRepo,
      defaultPageData,
      findOne: queryService.findOne,
      sanitizeCampaignListItem,
    });

  const update = async (id, dto, userId) => {
    const campaign = await queryService.findOne(id, userId);
    validateActivation(campaign, dto, pageHasContent);
    applyDtoToCampaign(campaign, dto);
    await syncCampaignTrackings(campaign.id, dto, getTrackingRepo());

    delete campaign.trackings;
    await persistCampaign(campaign);
    const refreshed = sanitizeCampaignListItem(
      await queryService.findOne(id, userId),
    );
    await invalidateFlowCampaignCache(refreshed);
    return refreshed;
  };

  const getFlow = (id, userId) =>
    getCampaignFlow(id, userId, { findOne: queryService.findOne });

  const updateFlow = (id, dto, userId) =>
    updateCampaignFlow(id, dto, userId, {
      findOne: queryService.findOne,
      persistCampaign,
      ensureFlowPages,
    });

  const remove = async (id, userId) => {
    const campaign = await queryService.findOne(id, userId);
    campaign.active = false;
    await persistCampaign(campaign);
    await invalidateFlowCampaignCache(campaign);
  };

  return {
    persistCampaign,
    findAll: queryService.findAll,
    assertOwnership: queryService.assertOwnership,
    findOne: queryService.findOne,
    findByCountryOperator: queryService.findByCountryOperator,
    findByIdForFlow: queryService.findByIdForFlow,
    findByTrackingId: queryService.findByTrackingId,
    create,
    update,
    getFlow,
    updateFlow,
    remove,
    serializeCampaign,
  };
};
