import { cappingService } from '../../campaigns/capping.service.js';
import { flowEngineService } from '../core/engine.js';
import { wapBlockedError } from '../flows/index.js';

export const evaluateDetectCapping = async (campaign, input = {}) => {
  if (!campaign) return null;

  const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
  if (flowEngineService.isApiExposeFlow(flowConfig)) {
    throw wapBlockedError(
      flowEngineService.normalizeMode(campaign.verificationMode),
    );
  }

  const cappingResult = await cappingService.evaluateCapping(campaign, {
    vid: input.vid,
    vendorId: input.vendorId,
  });

  if (!cappingResult.isCapped) return null;

  if (cappingResult.action === 'fallback' && cappingResult.targetCampaign) {
    const target = cappingResult.targetCampaign;
    const targetCountry =
      target.marketOperator?.country?.code || target.country;
    const targetOperator =
      target.marketOperator?.name || target.operator;

    const queryParams = new URLSearchParams();
    if (targetCountry) queryParams.set('country', targetCountry);
    if (targetOperator) queryParams.set('operator', targetOperator);
    queryParams.set('campid', String(target.id));
    if (input.vid) queryParams.set('vid', input.vid);
    if (input.affId) queryParams.set('aff_id', input.affId);
    if (input.clickId) queryParams.set('click_id', input.clickId);
    if (input.rcid) queryParams.set('rcid', input.rcid);
    if (input.pack) queryParams.set('pack', input.pack);

    const fallbackUrl = `/subscription?${queryParams.toString()}`;
    return {
      phone: '',
      msisdn: '',
      detected: false,
      nextPage: 'HOME',
      heError: 'OFFER_CAPPED_REDIRECT',
      failRedirectUrl: fallbackUrl,
      successRedirectUrl: fallbackUrl,
    };
  }

  const err = new Error('This offer has been stopped');
  err.statusCode = 403;
  err.code = 'OFFER_STOPPED';
  throw err;
};
