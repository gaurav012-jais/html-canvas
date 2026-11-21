import { flowEngineService } from '../../../flow/core/engine.js';
import { invalidateFlowCampaignCache } from '../campaign-cache.service.js';

export const getCampaignFlow = async (id, userId, { findOne }) => {
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

export const updateCampaignFlow = async (
  id,
  dto,
  userId,
  { findOne, persistCampaign, ensureFlowPages },
) => {
  const campaign = await findOne(id, userId);

  const mode =
    flowEngineService.normalizeMode(dto.verificationMode) ||
    flowEngineService.normalizeMode(campaign.verificationMode) ||
    'BOTH';

  let flowConfig;
  if (dto.flowConfig) {
    flowConfig = flowEngineService.stripUnreachableNodes(dto.flowConfig, mode);
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
