import { recordCgRedirectHop } from '../helpers/cg-redirect-log.js';
import { flowEngineService } from '../core/engine.js';
import { redisService } from '../../../common/services/redis.service.js';

export const handleEarlyLandingCg = async ({
  campaign,
  visitCtx,
  input,
  maybeNullFlowCgRedirect,
  isFlowCacheEnabled,
  verificationMode,
}) => {
  if (
    !campaign ||
    !visitCtx?.visitId ||
    typeof maybeNullFlowCgRedirect !== 'function' ||
    !flowEngineService.isLandingCgRedirectMode(verificationMode)
  ) {
    return null;
  }

  const landingCg = await maybeNullFlowCgRedirect(
    campaign,
    visitCtx.visitId,
    input,
    { when: 'landing' },
  );
  if (!landingCg) return null;

  await recordCgRedirectHop({
    visitId: visitCtx.visitId,
    campaign,
    redirectUrl: landingCg,
    trigger: 'landing',
  });

  const result = {
    phone: '',
    hasMsisdn: false,
    subscribed: false,
    isActive: false,
    subscriptionStatus: null,
    blocked: false,
    blockReason: null,
    heProvider: 'none',
    heError: null,
    nextPage: null,
    failRedirectUrl: null,
    successRedirectUrl: null,
    cgRedirectUrl: campaign.cgRedirectUrl || null,
    externalRedirect: landingCg,
    verificationMode,
    country: input.country || campaign.country,
    operator: input.operator || campaign.operator,
    campaignId: campaign.id || null,
    visitId: visitCtx.visitId,
    clickId: visitCtx.clickId,
    rcid: visitCtx.rcid,
  };

  if (isFlowCacheEnabled()) {
    await redisService.set(
      `flow:detect:result:${visitCtx.visitId}`,
      result,
      60,
    );
  }
  return result;
};

export const handleNeedsClientHe = ({
  heMeta,
  heProviderResolved,
  campaign,
  isApiHeProvider,
  applyHeRedirectVars,
  heRedirectVarsFor,
  input,
  visitCtx,
}) => {
  let rawFail = String(heMeta.failRedirectUrl || '').trim();
  if (!rawFail && isApiHeProvider(heProviderResolved)) {
    rawFail = String(campaign?.cgRedirectUrl || '').trim();
  }
  const heRedirectVars = heRedirectVarsFor('');
  const failRedirectUrl = rawFail
    ? applyHeRedirectVars(rawFail, heRedirectVars) || rawFail
    : '';
  const successRedirectUrl = heMeta.successRedirectUrl
    ? applyHeRedirectVars(heMeta.successRedirectUrl, heRedirectVars) ||
      heMeta.successRedirectUrl
    : '';

  return {
    phone: '',
    hasMsisdn: false,
    subscribed: false,
    isActive: false,
    subscriptionStatus: null,
    blocked: false,
    blockReason: null,
    heProvider: heProviderResolved,
    heError: null,
    needsClientHe: true,
    heClientConfig: heMeta.clientConfig || null,
    nextPage: null,
    failRedirectUrl: failRedirectUrl || null,
    successRedirectUrl: successRedirectUrl || null,
    cgRedirectUrl: campaign?.cgRedirectUrl || null,
    country: input.country || campaign?.country,
    operator: input.operator || campaign?.operator,
    campaignId: campaign?.id || null,
    visitId: visitCtx.visitId,
    clickId: visitCtx.clickId,
    rcid: visitCtx.rcid,
  };
};
