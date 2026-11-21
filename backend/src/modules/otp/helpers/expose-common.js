import { getRepository } from '../../../database/index.js';
import { mintClickId } from '../../flow/helpers/click-id.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { Visit, VisitStatus } from '../../../database/entities/visit.entity.js';
import {
  VisitEvent,
  VisitEventType,
} from '../../../database/entities/visit-event.entity.js';
import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { flowEngineService } from '../../flow/core/engine.js';
import { searchService } from '../../search/search.service.js';
import { apiCallLogService } from '../../flow/api-call-log.service.js';
import { resolveApprovalHold } from './approval-control.js';
import { exposeVisitStatusPatch } from './expose-visit.js';

export const getApiConfigRepo = () => getRepository(ApiConfig);
export const getCampaignRepo = () => getRepository(Campaign);
export const getTrackingRepo = () => getRepository(CampaignTracking);
export const getVendorRepo = () => getRepository(Vendor);
export const getVisitRepo = () => getRepository(Visit);
export const getVisitEventRepo = () => getRepository(VisitEvent);

export const pendingKey = (visitId, phone) =>
  `otp:pending:${visitId || 'none'}:${String(phone).trim()}`;

export const exposePendingKey = (campaignId, vendorId, phone) =>
  `otp:pending:expose:${campaignId}:${vendorId || 'none'}:${String(phone).trim()}`;

export const serializeInboundBody = (body) => {
  if (body == null) return null;
  try {
    return typeof body === 'string' ? body : JSON.stringify(body);
  } catch {
    return String(body);
  }
};

export const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

export const normalizeMsisdn = (phone) =>
  String(phone || '').replace(/\D/g, '');

export const missingVendorError = (campaignId) => {
  const err = new Error(
    `vendorId is required. Use GET/POST /api/otp/${campaignId}/{vendorId}/send and /verify`,
  );
  err.statusCode = 400;
  return err;
};

export const assertApiExposeCampaign = (campaign) => {
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.statusCode = 404;
    throw err;
  }
  const mode =
    flowEngineService.normalizeMode(campaign.verificationMode) || 'BOTH';
  const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
  if (mode !== 'OTP_ONLY' || !flowEngineService.isApiExposeFlow(flowConfig)) {
    const err = new Error(
      'This campaign does not expose OTP APIs. Set OTP only → API expose in Subscription flow.',
    );
    err.statusCode = 400;
    throw err;
  }
};

export const resolveAssignedVendor = async (campaign, vendorRaw) => {
  const ref = String(vendorRaw || '').trim();
  if (!ref) throw missingVendorError(campaign.id);

  let vendor = null;
  if (/^\d+$/.test(ref)) {
    vendor = await getVendorRepo().findOne({ where: { id: Number(ref) } });
  }
  if (!vendor) {
    vendor = await getVendorRepo().findOne({
      where: { code: ref, userId: campaign.userId },
    });
  }
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }
  if (vendor.active === false) {
    const err = new Error('Vendor is deactivated');
    err.statusCode = 400;
    throw err;
  }

  const tracking = await getTrackingRepo().findOne({
    where: { campaignId: campaign.id, vendorId: vendor.id },
  });
  if (!tracking || tracking.active === false) {
    const err = new Error('This vendor is not assigned to the campaign');
    err.statusCode = 400;
    throw err;
  }

  return { vendor, tracking };
};

export const resolveExposePayoutHold = async (
  campaignId,
  vendorId,
  payoutPercentRaw,
  decisionKey,
) =>
  resolveApprovalHold({
    campaignId,
    vendorId,
    payoutPercent: payoutPercentRaw,
    decisionKey,
  });

export const logInboundExpose = async ({
  callType,
  visit,
  campaignId,
  phone,
  requestUrl,
  requestBody,
  responseStatus,
  responseBody,
  success,
  errorMessage,
  statusLabel,
}) => {
  try {
    await apiCallLogService.record({
      visitId: visit?.id || null,
      campaignId: campaignId || visit?.campaignId || null,
      msisdn: phone,
      rcid: visit?.rcid || null,
      clickId: visit?.clickId || null,
      callType,
      requestUrl,
      requestBody,
      responseStatus: responseStatus ?? null,
      responseBody: serializeBody(responseBody),
      success: Boolean(success),
      errorMessage: success ? null : errorMessage || null,
      statusLabel: statusLabel || (success ? 'SUCCESS' : 'FAILED'),
    });
  } catch (err) {
    console.warn(`OTP expose inbound log failed: ${err.message}`);
  }
};

export const logOtpEvent = async (visitId, eventType, metadata) => {
  if (!visitId) return;
  try {
    const eventEntity = getVisitEventRepo().create({
      visitId: parseInt(visitId, 10),
      eventType,
      metadata,
    });
    await getVisitEventRepo().insert(eventEntity);
    try {
      void searchService.indexEvent({
        visitId: parseInt(visitId, 10),
        campaignId: metadata?.campaignId || null,
        vendorId: metadata?.vendorId || null,
        phone: metadata?.msisdn || metadata?.phone || null,
        phoneMasked: metadata?.msisdn || metadata?.phone || null,
        eventType,
        status: metadata?.held
          ? 'HELD'
          : metadata?.alreadySubscribed
            ? 'ALREADY_SUBSCRIBED'
            : metadata?.success === false
              ? 'FAILED'
              : metadata?.success
                ? 'SUCCESS'
                : null,
        requestUrl: metadata?.partnerUrl || metadata?.inboundUrl || null,
        responseStatus: metadata?.httpStatus ?? null,
        success: metadata?.success,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // swallow ES
    }
  } catch (err) {
    console.warn(`Failed to log OTP event: ${err.message}`);
  }
};

export const logOtpApiCall = async ({
  callType,
  visit,
  campaignId,
  phone,
  result,
  statusLabel,
}) => {
  try {
    await apiCallLogService.record({
      visitId: visit?.id || null,
      campaignId: campaignId || visit?.campaignId || null,
      msisdn: phone,
      rcid: visit?.rcid || null,
      clickId: visit?.clickId || null,
      callType,
      requestUrl: result?.requestUrl || null,
      requestBody: result?.requestBody || null,
      responseStatus: result?.httpStatus ?? null,
      responseBody: serializeBody(result?.rawResponse),
      success: Boolean(result?.success),
      errorMessage: result?.success ? null : result?.error || null,
      statusLabel: statusLabel || (result?.success ? 'SUCCESS' : 'FAILED'),
    });
  } catch (err) {
    console.warn(`OTP api_call_logs write failed: ${err.message}`);
  }
};

export const ensureExposeVisit = async ({
  campaign,
  phone,
  clientIp,
  landingUrl,
  visitStatus,
  vendorId,
  userAgent,
  customClickId,
}) => {
  const cId = campaign.id;
  const msisdn = normalizeMsisdn(phone);
  if (!msisdn) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  const vid = Number(vendorId) || null;
  const where = { campaignId: cId, phone: msisdn };
  if (vid) where.vendorId = vid;

  const existing = await getVisitRepo().findOne({
    where,
    order: { id: 'DESC' },
  });

  if (existing) {
    const patch = {
      phone: msisdn,
      landingUrl: landingUrl || existing.landingUrl,
      updatedAt: new Date(),
    };
    if (clientIp) {
      patch.ipAddress = String(clientIp).split(',')[0].trim();
    }
    if (userAgent && !existing.userAgent) {
      patch.userAgent = userAgent;
    }
    const nextStatus = exposeVisitStatusPatch(existing, visitStatus);
    if (nextStatus) {
      patch.visitStatus = nextStatus;
    }
    if (vid && !existing.vendorId) {
      patch.vendorId = vid;
    }
    await getVisitRepo().update({ id: existing.id }, patch);
    return { ...existing, ...patch, id: existing.id };
  }

  const clickId = customClickId || mintClickId();
  const visit = getVisitRepo().create({
    campaignId: cId,
    vendorId: vid,
    phone: msisdn,
    country: campaign.country || null,
    operator: campaign.operator || null,
    ipAddress: clientIp ? String(clientIp).split(',')[0].trim() : null,
    userAgent: userAgent || null,
    landingUrl: landingUrl || null,
    clickId,
    pageType: CampaignPageType.OTP,
    visitStatus: visitStatus || VisitStatus.OTP_SHOWN,
  });
  const saved = await getVisitRepo().save(visit);

  await logOtpEvent(saved.id, VisitEventType.VISIT, {
    source: 'otp_expose',
    campaignId: cId,
    vendorId: vid,
    msisdn,
    landingUrl: landingUrl || null,
  });

  try {
    void searchService.indexEvent({
      campaignId: cId,
      visitId: saved.id,
      vendorId: vid,
      clickId,
      phone: msisdn,
      phoneMasked: msisdn,
      eventType: VisitEventType.VISIT,
      status: visitStatus || VisitStatus.OTP_SHOWN,
      pageType: CampaignPageType.OTP,
      ip: saved.ipAddress,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // swallow
  }

  return saved;
};

export const getCampaignFromInput = async (campaignId, visitId) => {
  let cId = campaignId ? parseInt(campaignId, 10) : undefined;
  if (!cId && visitId) {
    const visit = await getVisitRepo().findOne({
      where: { id: parseInt(visitId, 10) },
    });
    if (visit) cId = visit.campaignId;
  }
  if (!cId) return null;
  return getCampaignRepo().findOne({ where: { id: cId } });
};

export const getApiConfigForCampaign = async (campaignId) => {
  if (!campaignId) return null;
  return getApiConfigRepo().findOne({ where: { campaignId } });
};

export const loadVisit = async (visitId) => {
  if (!visitId) return null;
  return getVisitRepo().findOne({ where: { id: parseInt(visitId, 10) } });
};
