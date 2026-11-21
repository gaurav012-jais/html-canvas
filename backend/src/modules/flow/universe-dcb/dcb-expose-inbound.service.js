import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { Visit, VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';
import { apiCallLogService } from '../api-call-log.service.js';
import {
  DCB_EXPOSE_INBOUND_CALL_TYPES,
  DCB_EXPOSE_INBOUND_EVENT_TYPES,
  serializeDcbExposeInboundBody,
} from '../helpers/dcb-expose-inbound.js';
import {
  cleanPhone,
  httpError,
  loadVisitFromRequestId,
  loadLatestVisitForMsisdn,
  logVisitEvent,
} from './dcb-expose-session.js';

export { logVisitEvent };

const getCampaignRepo = () => getRepository(Campaign);
const getVisitRepo = () => getRepository(Visit);

export const patchExposeVisit = async (visit, { msisdn, vendorId, clientIp, landingUrl }) => {
  const vid = Number(vendorId) || null;
  const patch = {
    landingUrl: landingUrl || visit.landingUrl,
    updatedAt: new Date(),
  };
  if (msisdn) patch.phone = msisdn;
  if (clientIp) patch.ipAddress = String(clientIp).split(',')[0].trim();
  if (vid && !visit.vendorId) patch.vendorId = vid;
  await getVisitRepo().update({ id: visit.id }, patch);
  return { ...visit, ...patch, id: visit.id };
};

export const ensureExposeVisit = async ({
  campaign,
  phone,
  vendorId,
  clientIp,
  landingUrl,
  existingVisit,
  reuseVisitId,
  allowMissingMsisdn = false,
}) => {
  const msisdn = cleanPhone(phone);
  const vid = Number(vendorId) || null;

  if (existingVisit?.id) {
    return patchExposeVisit(existingVisit, {
      msisdn,
      vendorId: vid,
      clientIp,
      landingUrl,
    });
  }

  if (reuseVisitId) {
    const linked = await getVisitRepo().findOne({
      where: { id: Number(reuseVisitId) },
    });
    if (linked) {
      return patchExposeVisit(linked, {
        msisdn,
        vendorId: vid,
        clientIp,
        landingUrl,
      });
    }
  }

  if (!msisdn && !allowMissingMsisdn) {
    throw httpError('MSISDN is required', 400, 'MSISDN_REQUIRED');
  }

  // Always insert a new visit for each pincode attempt. Do not reuse MSISDN
  // sessions or mint click_id — vendors report success/fail themselves.
  const saved = await getVisitRepo().save(
    getVisitRepo().create({
      campaignId: campaign.id,
      vendorId: vid,
      phone: msisdn || null,
      country: campaign.country || null,
      operator: campaign.operator || null,
      ipAddress: clientIp ? String(clientIp).split(',')[0].trim() : null,
      landingUrl: landingUrl || null,
      clickId: null,
      pageType: CampaignPageType.OTP,
      visitStatus: VisitStatus.OTP_SHOWN,
    }),
  );
  await logVisitEvent(saved.id, VisitEventType.VISIT, {
    source: 'dcb_expose',
    campaignId: campaign.id,
    vendorId: vid,
    msisdn: msisdn || null,
  });
  return saved;
};

export const serializeBody = (body) => {
  if (body == null) return null;
  try {
    return typeof body === 'string' ? body : JSON.stringify(body);
  } catch {
    return String(body);
  }
};

export const logInboundExpose = async (
  {
    callType,
    visit,
    campaignId,
    vendorId,
    phone,
    requestUrl,
    requestBody,
    responseStatus,
    responseBody,
    success,
    errorMessage,
    statusLabel,
  },
  callLogger = apiCallLogService,
) => {
  try {
    await callLogger.record({
      visitId: visit?.id || null,
      campaignId: campaignId || visit?.campaignId || null,
      vendorId: vendorId || visit?.vendorId || null,
      msisdn: phone,
      rcid: visit?.rcid || null,
      clickId: null,
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
    console.warn(`DCB expose inbound log failed: ${err.message}`);
  }
};

export const mintLogVisit = async ({
  campaignId,
  vendorId,
  msisdn,
  clientIp,
  landingUrl,
} = {}) => {
  const cId = parseInt(campaignId, 10);
  if (!cId) return null;
  try {
    const campaign =
      (await getCampaignRepo().findOne({ where: { id: cId } })) || { id: cId };
    return await ensureExposeVisit({
      campaign,
      phone: msisdn,
      vendorId,
      clientIp,
      landingUrl,
      allowMissingMsisdn: true,
    });
  } catch (err) {
    console.warn(`DCB expose visit mint failed: ${err.message}`);
    return null;
  }
};

export const seedExposeVisit = async (action, input = {}, clientIp, landingUrl) => {
  if (action === 'config') return null;
  const safeInput = input || {};
  if (action === 'confirm') {
    const linked = await loadVisitFromRequestId(safeInput);
    if (linked) return linked;
  }
  if (action === 'status') {
    const latest = await loadLatestVisitForMsisdn(safeInput);
    if (latest) return latest;
  }
  return mintLogVisit({
    campaignId: safeInput.campaignId,
    vendorId: safeInput.vendorId,
    msisdn: safeInput.msisdn,
    clientIp,
    landingUrl,
  });
};

export const runExpose = async (
  action,
  input = {},
  clientIp,
  meta = {},
  work,
  callLogger = apiCallLogService,
) => {
  const safeInput = input || {};
  const inboundUrl = meta?.requestUrl || '';
  const inboundBody = serializeDcbExposeInboundBody(safeInput);
  const callType = DCB_EXPOSE_INBOUND_CALL_TYPES[action];
  const eventType = DCB_EXPOSE_INBOUND_EVENT_TYPES[action];
  const campaignId = parseInt(safeInput.campaignId, 10) || null;
  const vendorId = Number(safeInput.vendorId) || null;
  const phone = cleanPhone(safeInput.msisdn);
  const visit = await seedExposeVisit(action, safeInput, clientIp, inboundUrl);

  const persistProviderLog = async (logRecord) => {
    if (!logRecord) return;
    try {
      await callLogger.record(logRecord);
    } catch (logError) {
      console.warn(`DCB expose log failed: ${logError.message}`);
    }
  };

  try {
    const result = await work(visit);
    // Inbound first (client → us), then outbound (us → DCB) for timeline order.
    await logInboundExpose(
      {
        callType,
        visit: result.visit || visit,
        campaignId: result.campaignId || campaignId,
        vendorId: result.vendorId || vendorId,
        phone: result.msisdn || phone,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: 200,
        responseBody: result.payload,
        success: true,
      },
      callLogger,
    );
    await persistProviderLog(result.providerLog);
    return result.payload;
  } catch (err) {
    await logInboundExpose(
      {
        callType,
        visit,
        campaignId,
        vendorId,
        phone,
        requestUrl: inboundUrl,
        requestBody: inboundBody,
        responseStatus: err.statusCode || 500,
        responseBody: { error: err.message, code: err.code || null },
        success: false,
        errorMessage: err.message,
      },
      callLogger,
    );
    await persistProviderLog(err.providerLog);
    if (visit?.id && eventType && !err.held) {
      await logVisitEvent(visit.id, eventType, {
        source: 'dcb_expose',
        campaignId,
        vendorId,
        msisdn: phone || null,
        success: false,
        error: err.message,
        code: err.code || null,
      });
    }
    throw err;
  }
};
