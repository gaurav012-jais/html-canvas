import { VisitStatus } from '../../../database/entities/visit.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { flowEngineService } from '../../flow/core/engine.js';
import { cappingService } from '../../campaigns/capping.service.js';
import {
  getCampaignRepo,
  serializeInboundBody,
  normalizeMsisdn,
  assertApiExposeCampaign,
  resolveAssignedVendor,
  logInboundExpose,
  ensureExposeVisit,
  getApiConfigForCampaign,
} from '../helpers/expose-common.js';

// Lazy loaders prevent circular dependency TDZ errors with flow modules
const getOrangeBfService = async () =>
  (await import('../../flow/orange-bf.service.js')).orangeBfService;
const getUniverseDcbService = async () =>
  (await import('../../flow/universe-dcb.service.js')).universeDcbService;
const getPartnerApiService = async () =>
  (await import('../../flow/partner-api.service.js')).partnerApiService;

/**
 * Public API-expose mediator for subscriber checksub.
 */
export const exposeChecksub = async (
  { campaignId, vendorId, phone, ip, ua, txid } = {},
  clientIp,
  meta = {},
) => {
  const cId = parseInt(campaignId, 10);
  if (!cId) {
    const err = new Error('campaignId is required');
    err.statusCode = 400;
    throw err;
  }
  const msisdn = normalizeMsisdn(phone);
  if (!msisdn) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  const inboundUrl =
    meta?.requestUrl || `/api/otp/${cId}/${vendorId || '{vendorId}'}/checksub`;
  const inboundBody = serializeInboundBody({
    msisdn,
    vendorId: vendorId || null,
    txid: txid || null,
  });

  const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
  try {
    assertApiExposeCampaign(campaign);
  } catch (err) {
    await logInboundExpose({
      callType: ApiCallType.CHECKSUB,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: err.statusCode || 400,
      success: false,
      errorMessage: err.message,
    });
    throw err;
  }

  let activeCampaign = campaign;
  let activeCId = cId;
  const cappingResult = await cappingService.evaluateCapping(campaign, {
    vendorId,
  });

  if (cappingResult.isCapped) {
    if (cappingResult.action === 'fallback' && cappingResult.targetCampaign) {
      activeCampaign = cappingResult.targetCampaign;
      activeCId = activeCampaign.id;
    } else {
      const stoppedMsg = 'Offer is stopped due to capping limit';
      await logInboundExpose({
        callType: ApiCallType.CHECKSUB,
        campaignId: cId,
        phone: msisdn,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 403,
        success: false,
        errorMessage: stoppedMsg,
        statusLabel: 'OFFER_STOPPED',
      });
      const err = new Error(stoppedMsg);
      err.statusCode = 403;
      err.code = 'OFFER_STOPPED';
      throw err;
    }
  }

  let vendor;
  try {
    ({ vendor } = await resolveAssignedVendor(activeCampaign, vendorId));
  } catch (err) {
    await logInboundExpose({
      callType: ApiCallType.CHECKSUB,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: err.statusCode || 400,
      success: false,
      errorMessage: err.message,
    });
    throw err;
  }

  const finalIp = ip
    ? String(ip).split(',')[0].trim()
    : clientIp
      ? String(clientIp).split(',')[0].trim()
      : '';
  const finalUa = ua || '';

  const visit = await ensureExposeVisit({
    campaign: activeCampaign,
    phone: msisdn,
    clientIp: finalIp,
    userAgent: finalUa,
    customClickId: txid || null,
    landingUrl: inboundUrl,
    visitStatus: VisitStatus.VISIT,
    vendorId: vendor.id,
  });

  await cappingService.incrementCampaignClickCount(
    activeCId,
    activeCampaign.cappingInterval,
    vendor.id,
  );

  const finalTxid = txid || visit.clickId || String(visit.id);
  const apiConfig = await getApiConfigForCampaign(activeCId);
  const vMode = flowEngineService.normalizeMode(campaign?.verificationMode);

  const logAndReturn = async (payload, statusLabel) => {
    await logInboundExpose({
      callType: ApiCallType.CHECKSUB,
      visit,
      campaignId: cId,
      phone: msisdn,
      requestUrl: inboundUrl,
      requestBody: inboundBody,
      responseStatus: 200,
      responseBody: payload,
      success: true,
      statusLabel,
    });
    return payload;
  };

  const buildChecksubPayload = (statusUpper, isSubActive) => ({
    msisdn,
    status: statusUpper,
    active: isSubActive,
    shouldSkipSubscribe: isSubActive,
    go: isSubActive ? 'page' : 'continue',
    page: isSubActive ? 'THANKYOU' : null,
    visitId: visit.id,
    clickId: visit.clickId,
    vendorId: vendor.id,
    message: isSubActive
      ? 'Subscriber already has an active subscription'
      : 'Subscriber is not active (new user)',
  });

  if (vMode === 'ORANGE_BF') {
    const orangeBf = await getOrangeBfService();
    const bfResult = await orangeBf.startOrCheckSub({
      phone: msisdn,
      campaignId: campaign.id,
      visitId: visit.id,
      vendorId: vendor.id,
    });
    const isSubActive = Boolean(
      bfResult.status === 'active' ||
      bfResult.outcome === 'active' ||
      bfResult.active,
    );
    const statusUpper = String(
      bfResult.status ||
        bfResult.outcome ||
        (isSubActive ? 'ACTIVE' : 'INACTIVE'),
    ).toUpperCase();
    return logAndReturn(buildChecksubPayload(statusUpper, isSubActive), statusUpper);
  }

  if (vMode === 'UNIVERSE_DCB') {
    let dcbOutcome = null;
    try {
      const universeDcb = await getUniverseDcbService();
      dcbOutcome = await universeDcb.manualCheck({
        msisdn,
        phone: msisdn,
        campaignId: campaign.id,
        visitId: visit.id,
        serviceId: campaign.serviceId,
      });
    } catch (dcbErr) {
      console.warn('DCB manualCheck error in exposeChecksub:', dcbErr.message);
    }
    const isSubActive = Boolean(
      dcbOutcome?.outcome === 'ENTITLED' || dcbOutcome?.status === 'ACTIVE',
    );
    const statusUpper = String(
      dcbOutcome?.status ||
        dcbOutcome?.outcome ||
        (isSubActive ? 'ACTIVE' : 'INACTIVE'),
    ).toUpperCase();
    return logAndReturn(buildChecksubPayload(statusUpper, isSubActive), statusUpper);
  }

  if (!apiConfig?.subscriptionApi) {
    const resp = {
      msisdn,
      status: 'INACTIVE',
      active: false,
      visitId: visit.id,
      clickId: visit.clickId,
      vendorId: vendor.id,
      message: 'No subscriptionApi configured; subscriber is considered new',
    };
    return logAndReturn(resp, 'INACTIVE');
  }

  const checkInput = {
    phone: msisdn,
    msisdn,
    campaignId: cId,
    visitId: visit.id,
    country: campaign.country,
    operator: campaign.operator,
    serviceId: campaign.serviceId,
    txid: finalTxid,
    clickId: visit.clickId,
    ip: finalIp,
    ua: finalUa,
  };

  const partnerApi = await getPartnerApiService();
  const checkResult = await partnerApi.checkSubscription(
    apiConfig,
    checkInput,
  );

  const isSubActive = Boolean(checkResult.isActive);
  const rawStatus =
    checkResult.currentStatus ||
    checkResult.subscriptionStatus ||
    checkResult.status ||
    (isSubActive ? 'ACTIVE' : 'INACTIVE');
  const statusUpper = String(rawStatus).toUpperCase();

  const responsePayload = {
    msisdn,
    status: statusUpper,
    active: isSubActive,
    shouldSkipSubscribe: Boolean(checkResult.shouldSkipSubscribe),
    go: checkResult.go || null,
    page: checkResult.page || null,
    visitId: visit.id,
    clickId: visit.clickId,
    vendorId: vendor.id,
    message: isSubActive
      ? 'Subscriber already has an active subscription'
      : 'Subscriber is not active (new user)',
  };

  return logAndReturn(responsePayload, isSubActive ? 'ACTIVE' : 'INACTIVE');
};
