import { ALL_CAMPAIGN_PAGE_TYPES } from '../../../../database/entities/campaign-page.entity.js';
import { flowEngineService } from '../../../flow/core/engine.js';
import { marketsService } from '../../../markets/markets.service.js';
import {
  deriveCountryCode,
  deriveOperatorCode,
} from '../../../markets/helpers/tracking-id.util.js';
import { normalize } from './campaign-query.service.js';

export const createCampaignWithPages = async (dto, userId, deps = {}) => {
  const getCampaignRepo = deps.getCampaignRepo;
  const getCampaignPageRepo = deps.getCampaignPageRepo;
  const getTemplateRepo = deps.getTemplateRepo;
  const defaultPageData = deps.defaultPageData || (() => ({}));
  const findOne = deps.findOne;
  const sanitizeCampaignListItem =
    deps.sanitizeCampaignListItem || ((c) => c);

  const { country, operator } = await marketsService.resolveOperatorForCreate({
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
  });

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
