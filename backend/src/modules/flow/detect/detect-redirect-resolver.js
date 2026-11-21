import { pageTypeForSubscriptionStatus } from '../../../database/entities/campaign-page.entity.js';
import { flowEngineService } from '../core/engine.js';
import {
  isPacksOnHome,
  resolvePacksOnHomeNoPhone,
} from '../routing/funnel-layout.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';

export const resolveDetectRedirects = ({
  rawPhone,
  hasBlocklist,
  blocked,
  hasChecksub,
  subRes,
  isActive,
  subscriptionStatus,
  ruleExternalUrl,
  campaignSuccessRedirectUrl,
  successRedirectUrl,
  failRedirectUrl,
  campaign,
  flowConfigForStart,
  verificationMode,
  isApiHeProviderResolved,
  applyHeRedirectVars,
  heRedirectVars,
}) => {
  const mappedStatusPage =
    subRes?.go === 'page' && subRes?.page
      ? subRes.page
      : pageTypeForSubscriptionStatus(subscriptionStatus, isActive);
  const normalizedStatus = String(subscriptionStatus || '')
    .trim()
    .toLowerCase();
  const isNewStatus =
    subRes?.go === 'continue' || normalizedStatus === 'new';

  let nextPage = null;
  let outboundFailRedirectUrl = failRedirectUrl || null;
  let outboundSuccessRedirectUrl = successRedirectUrl || null;

  if (rawPhone && hasBlocklist && blocked) {
    nextPage = 'BLOCKED';
    outboundSuccessRedirectUrl = null;
    outboundFailRedirectUrl = null;
  } else if (rawPhone && hasChecksub) {
    if (ruleExternalUrl) {
      outboundSuccessRedirectUrl = ruleExternalUrl;
      outboundFailRedirectUrl = null;
      nextPage = null;
    } else if (isActive) {
      outboundSuccessRedirectUrl = campaignSuccessRedirectUrl || null;
      if (!outboundSuccessRedirectUrl) {
        nextPage = 'THANKYOU';
      }
    } else if (isNewStatus) {
      outboundSuccessRedirectUrl = successRedirectUrl || null;
      outboundFailRedirectUrl = null;
      if (!outboundSuccessRedirectUrl && isPacksOnHome(campaign)) {
        const afterHe = flowEngineService.nextPage(
          flowConfigForStart,
          'HOME',
          'HEADER_RESOLVED',
        );
        nextPage = afterHe === 'THANKYOU' ? 'THANKYOU' : 'HOME';
      }
    } else if (mappedStatusPage) {
      outboundSuccessRedirectUrl = null;
      nextPage = mappedStatusPage;
      outboundFailRedirectUrl = null;
    } else {
      outboundSuccessRedirectUrl = null;
      outboundFailRedirectUrl = null;
    }
  } else if (rawPhone && !hasChecksub) {
    outboundSuccessRedirectUrl = successRedirectUrl || null;
  }

  let redirectOutcome = 'stay';
  let redirectUrl = null;
  if (rawPhone && nextPage === 'BLOCKED') {
    redirectOutcome = 'blocked';
  } else if (rawPhone && nextPage) {
    redirectOutcome = String(nextPage).toLowerCase();
  } else if (rawPhone && outboundSuccessRedirectUrl) {
    redirectOutcome = ruleExternalUrl
      ? 'checksub_external'
      : isActive
        ? 'campaign_success'
        : 'he_success';
    redirectUrl = outboundSuccessRedirectUrl;
  } else if (
    !rawPhone &&
    outboundFailRedirectUrl &&
    isApiHeProviderResolved
  ) {
    redirectOutcome = 'fail';
    redirectUrl = outboundFailRedirectUrl;
  }

  if (!rawPhone && isPacksOnHome(campaign)) {
    const landing = resolvePacksOnHomeNoPhone(verificationMode);
    if (landing.nextPage) {
      nextPage = landing.nextPage;
    }
    if (landing.useFailRedirect) {
      if (!outboundFailRedirectUrl) {
        const cgFail = String(campaign?.cgRedirectUrl || '').trim();
        outboundFailRedirectUrl = cgFail
          ? applyHeRedirectVars(cgFail, heRedirectVars) || cgFail
          : null;
      }
      if (outboundFailRedirectUrl) {
        redirectOutcome = 'fail';
        redirectUrl = outboundFailRedirectUrl;
      } else {
        redirectOutcome = 'error';
        redirectUrl = null;
      }
    } else {
      outboundFailRedirectUrl = null;
      redirectOutcome = landing.nextPage
        ? String(landing.nextPage).toLowerCase()
        : 'stay';
      redirectUrl = null;
    }
  }

  if (!rawPhone) {
    outboundSuccessRedirectUrl = null;
  }

  return {
    nextPage,
    outboundFailRedirectUrl,
    outboundSuccessRedirectUrl,
    redirectOutcome,
    redirectUrl,
  };
};

export const logDetectRedirectDecision = async ({
  runHe,
  visitId,
  campaignId,
  rawPhone,
  rcid,
  clickId,
  redirectUrl,
  redirectOutcome,
  heProviderResolved,
  heMeta,
  subscriptionStatus,
  isActive,
  blocked,
  blockReason,
  nextPage,
  verificationMode,
}) => {
  if (!runHe || (!visitId && !campaignId)) return;
  try {
    await apiCallLogService.record({
      visitId,
      campaignId,
      msisdn: rawPhone || null,
      rcid,
      clickId,
      callType: ApiCallType.HE_REDIRECT,
      requestUrl: redirectUrl,
      requestBody: JSON.stringify({
        outcome: redirectOutcome,
        heProvider: heProviderResolved,
        heError: heMeta?.error || null,
        subscriptionStatus: subscriptionStatus || null,
        isActive,
        blocked,
        blockReason,
        nextPage,
        verificationMode,
      }),
      responseStatus: null,
      responseBody: null,
      success:
        redirectOutcome === 'he_success' ||
        redirectOutcome === 'campaign_success'
          ? true
          : redirectOutcome === 'fail'
            ? false
            : null,
      errorMessage:
        redirectOutcome === 'fail' ? heMeta?.error || null : null,
      statusLabel:
        redirectOutcome === 'he_success'
          ? 'HE_SUCCESS'
          : redirectOutcome === 'campaign_success'
            ? 'CAMPAIGN_SUCCESS'
            : redirectOutcome === 'fail'
              ? 'FAILED'
              : redirectOutcome === 'blocked'
                ? 'BLOCKED'
                : nextPage
                  ? String(nextPage).toUpperCase()
                  : 'STAY',
    });
  } catch (err) {
    console.warn(`he_redirect log failed: ${err.message}`);
  }
};

export const createHeRedirectVars = ({
  msisdn = '',
  input = {},
  campaign,
  visitCtx = {},
  dualIds = {},
}) => {
  const ourClickId = String(visitCtx.clickId || '').trim();
  return {
    msisdn: msisdn || '',
    phone: msisdn || '',
    country: input.country || campaign?.country || '',
    operator: input.operator || campaign?.operator || '',
    click_id: ourClickId,
    clickId: ourClickId,
    rcid: String(visitCtx.rcid || '').trim(),
    campid: String(dualIds.vendorCampid || input.campid || '').trim(),
    tracking_campid: String(
      dualIds.trackingCampid || input.trackingCampid || '',
    ).trim(),
  };
};

export const buildDetectResult = ({
  rawPhone,
  partnerChecks,
  heProviderResolved,
  heMeta,
  redirectResolution,
  campaign,
  verificationMode,
  input,
  visitCtx,
}) => ({
  phone: rawPhone,
  hasMsisdn: Boolean(rawPhone),
  subscribed: partnerChecks.subscribed,
  isActive: partnerChecks.isActive,
  subscriptionStatus: partnerChecks.subscriptionStatus,
  blocked: partnerChecks.blocked,
  blockReason: partnerChecks.blockReason,
  heProvider: heProviderResolved,
  heError: heMeta.error || null,
  nextPage: redirectResolution.nextPage,
  failRedirectUrl: redirectResolution.outboundFailRedirectUrl || null,
  successRedirectUrl: redirectResolution.outboundSuccessRedirectUrl || null,
  cgRedirectUrl: campaign?.cgRedirectUrl || null,
  verificationMode,
  country: input.country || campaign?.country,
  operator: input.operator || campaign?.operator,
  campaignId: campaign?.id || null,
  visitId: visitCtx.visitId,
  clickId: visitCtx.clickId,
  rcid: visitCtx.rcid,
});
