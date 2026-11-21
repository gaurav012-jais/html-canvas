/**
 * MSISDN Detection & Traffic Ingestion Orchestrator
 *
 * Safe, backward-compatible Facade delegating to specialized detection helpers:
 * - detect/detect-capping.helper: Campaign capping verification and fallback redirection
 * - detect/detect-landing.helper: Early Landing CG redirect handling & browser client HE response
 * - detect/detect-partner-check.helper: Partner subscriber checksub and blocklist querying
 * - detect/detect-redirect-resolver: Multi-hop next-page resolution, packs-on-home routing & audit logs
 */

import { analyticsService } from '../../analytics/analytics.service.js';
import { redisService } from '../../../common/services/redis.service.js';
import { splitDualCampids } from '../../markets/helpers/tracking-id.util.js';
import { heService } from '../he.service.js';
import { flowEngineService } from '../core/engine.js';
import { shouldRunHeOnDetect } from './he-gate.js';
import { evaluateDetectCapping } from './detect-capping.helper.js';
import {
  handleEarlyLandingCg,
  handleNeedsClientHe,
} from './detect-landing.helper.js';
import { executePartnerChecks } from './detect-partner-check.helper.js';
import {
  resolveDetectRedirects,
  logDetectRedirectDecision,
  createHeRedirectVars,
  buildDetectResult,
} from './detect-redirect-resolver.js';

export function createDetectMsisdn(deps) {
  const {
    getApiConfigRepo,
    isFlowCacheEnabled,
    isApiHeProvider,
    resolveCampaign,
    resolveSuccessRedirect,
    ensureVisitForDetect,
    applyHeRedirectVars,
    maybeNullFlowCgRedirect,
  } = deps;

  const detectMsisdn = async (input) => {
    const hintPhone = heService.normalizePhone(input.phone || '');
    const campaign = await resolveCampaign(input).catch(() => null);

    const cappedRedirect = await evaluateDetectCapping(campaign, input);
    if (cappedRedirect) return cappedRedirect;

    let apiConfig = null;
    let serviceId = campaign?.serviceId || '';
    let heMeta = {
      provider: 'header',
      error: null,
      failRedirectUrl: '',
      successRedirectUrl: '',
    };

    if (campaign?.id) {
      apiConfig = await getApiConfigRepo().findOne({
        where: { campaignId: campaign.id },
      });
    }

    if (input.visitId && isFlowCacheEnabled()) {
      const earlyCached = await redisService.get(
        `flow:detect:result:${input.visitId}`,
      );
      if (earlyCached) return earlyCached;
    }

    // Visit-first: mint our click_id before any HE / partner HTTP so logs attach.
    const visitCtx = await ensureVisitForDetect(campaign, input);
    if (visitCtx.visitId && isFlowCacheEnabled()) {
      const cached = await redisService.get(
        `flow:detect:result:${visitCtx.visitId}`,
      );
      if (cached) return cached;
    }

    const attrCtx = {
      visitId: visitCtx.visitId,
      campaignId: campaign?.id || null,
      clickId: visitCtx.clickId,
      rcid: visitCtx.rcid,
    };

    const verificationMode =
      flowEngineService.normalizeMode(campaign?.verificationMode) || 'BOTH';

    // Early landing CG hop for NONE verification mode
    const landingCgResult = await handleEarlyLandingCg({
      campaign,
      visitCtx,
      input,
      maybeNullFlowCgRedirect,
      isFlowCacheEnabled,
      verificationMode,
    });
    if (landingCgResult) return landingCgResult;

    const flowConfigForStart = campaign
      ? flowEngineService.parseFlowConfig(campaign.flowConfig)
      : null;
    const startConfig = flowEngineService.getStartConfig(
      flowConfigForStart,
      verificationMode,
    );
    const configuredHeProvider = String(apiConfig?.heProvider || 'header')
      .toLowerCase()
      .trim();

    const runHe =
      shouldRunHeOnDetect(verificationMode, startConfig) &&
      configuredHeProvider !== 'none';

    const heSource = String(input.heSource || '').toLowerCase().trim();

    if (apiConfig && runHe) {
      heMeta = await heService.resolve(apiConfig, {
        phone: hintPhone,
        hint: hintPhone,
        country: input.country || campaign?.country,
        operator: input.operator || campaign?.operator,
        sessionId: input.sessionId,
        heSource: heSource || undefined,
        heClientLogs: input.heClientLogs || null,
        heClientError: input.heClientError || null,
        ...attrCtx,
      });
    } else if (!runHe) {
      heMeta = {
        phone: '',
        provider: 'none',
        error: null,
        failRedirectUrl: '',
        successRedirectUrl: '',
      };
    }

    const heProviderResolved = runHe
      ? heMeta.provider || configuredHeProvider
      : 'none';

    const dualIds = splitDualCampids(input);
    const heRedirectVarsFor = (msisdn = '') =>
      createHeRedirectVars({ msisdn, input, campaign, visitCtx, dualIds });

    if (runHe && heMeta?.needsClientHe) {
      return handleNeedsClientHe({
        heMeta,
        heProviderResolved,
        campaign,
        isApiHeProvider,
        applyHeRedirectVars,
        heRedirectVarsFor,
        input,
        visitCtx,
      });
    }

    let rawPhone = '';
    if (!runHe) {
      rawPhone = '';
    } else if (isApiHeProvider(heProviderResolved)) {
      rawPhone = heMeta.phone ? heService.normalizePhone(heMeta.phone) : '';
    } else {
      rawPhone = heService.normalizePhone(heMeta.phone || hintPhone || '');
    }

    let partnerChecks = {
      hasChecksub: false,
      hasBlocklist: false,
      subRes: null,
      subscribed: false,
      isActive: false,
      subscriptionStatus: null,
      blocked: false,
      blockReason: null,
    };

    if (rawPhone && apiConfig) {
      partnerChecks = await executePartnerChecks(
        apiConfig,
        {
          phone: rawPhone,
          serviceId,
          country: input.country || campaign?.country,
          operator: input.operator || campaign?.operator,
          ...attrCtx,
        },
        startConfig,
      );
    }

    if (rawPhone && visitCtx.visitId) {
      await analyticsService
        .setVisitPhone(visitCtx.visitId, rawPhone)
        .catch(() => {});
    }

    const heRedirectVars = heRedirectVarsFor(rawPhone);
    let rawFail = String(heMeta.failRedirectUrl || '').trim();
    if (!rawPhone && !rawFail && isApiHeProvider(heProviderResolved)) {
      rawFail = String(campaign?.cgRedirectUrl || '').trim();
    }

    const failRedirectUrl = rawFail
      ? applyHeRedirectVars(rawFail, heRedirectVars) || rawFail
      : '';

    const successRedirectUrl = heMeta.successRedirectUrl
      ? applyHeRedirectVars(heMeta.successRedirectUrl, heRedirectVars) ||
        heMeta.successRedirectUrl
      : '';

    const ruleExternalUrl =
      partnerChecks.subRes?.go === 'external' && partnerChecks.subRes?.url
        ? applyHeRedirectVars(partnerChecks.subRes.url, heRedirectVars) ||
          partnerChecks.subRes.url
        : null;

    let campaignSuccessRedirectUrl = null;
    if (rawPhone && campaign?.successRedirectUrl?.trim()) {
      campaignSuccessRedirectUrl = await resolveSuccessRedirect(
        campaign,
        visitCtx.visitId,
        input,
      );
    }

    const redirectResolution = resolveDetectRedirects({
      rawPhone,
      hasBlocklist: partnerChecks.hasBlocklist,
      blocked: partnerChecks.blocked,
      hasChecksub: partnerChecks.hasChecksub,
      subRes: partnerChecks.subRes,
      isActive: partnerChecks.isActive,
      subscriptionStatus: partnerChecks.subscriptionStatus,
      ruleExternalUrl,
      campaignSuccessRedirectUrl,
      successRedirectUrl,
      failRedirectUrl,
      campaign,
      flowConfigForStart,
      verificationMode,
      isApiHeProviderResolved: isApiHeProvider(heProviderResolved),
      applyHeRedirectVars,
      heRedirectVars,
    });

    await logDetectRedirectDecision({
      runHe,
      visitId: visitCtx.visitId,
      campaignId: campaign?.id,
      rawPhone,
      rcid: visitCtx.rcid,
      clickId: visitCtx.clickId,
      redirectUrl: redirectResolution.redirectUrl,
      redirectOutcome: redirectResolution.redirectOutcome,
      heProviderResolved,
      heMeta,
      subscriptionStatus: partnerChecks.subscriptionStatus,
      isActive: partnerChecks.isActive,
      blocked: partnerChecks.blocked,
      blockReason: partnerChecks.blockReason,
      nextPage: redirectResolution.nextPage,
      verificationMode,
    });

    const result = buildDetectResult({
      rawPhone,
      partnerChecks,
      heProviderResolved,
      heMeta,
      redirectResolution,
      campaign,
      verificationMode,
      input,
      visitCtx,
    });

    if (visitCtx.visitId && isFlowCacheEnabled()) {
      await redisService.set(
        `flow:detect:result:${visitCtx.visitId}`,
        result,
        60,
      );
    }

    return result;
  };

  return { detectMsisdn };
}
