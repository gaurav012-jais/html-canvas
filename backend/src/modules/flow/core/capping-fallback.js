import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { flowEngineService } from './engine.js';
import { cappingService } from '../../campaigns/capping.service.js';

export async function evaluateLandingCappingFallback({
  campaign,
  input,
  flowConfigEarly,
  normalizePack,
}) {
  if (input.visitId) return null;

  const cappingResult = await cappingService.evaluateCapping(campaign, {
    vid: input.vid,
  });

  if (!cappingResult.isCapped) return null;

  if (cappingResult.action === 'fallback' && cappingResult.targetCampaign) {
    const target = cappingResult.targetCampaign;
    const targetCountry =
      target.marketOperator?.country?.name || target.country;
    const targetOperator = target.marketOperator?.name || target.operator;

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
      campaignId: campaign.id,
      visitId: null,
      pageType: CampaignPageType.HOME,
      entryPage: flowEngineService.getEntryPage(flowConfigEarly),
      templateId: null,
      html: '',
      css: '',
      variables: {},
      actions: [],
      pack: normalizePack(input.pack),
      projectData: {},
      cgRedirectUrl: null,
      subscriptionUrl: null,
      externalRedirect: fallbackUrl,
      clickId: input.clickId || null,
      rcid: input.rcid || null,
    };
  }

  const err = new Error('This offer has been stopped');
  err.statusCode = 403;
  err.code = 'OFFER_STOPPED';
  throw err;
}
