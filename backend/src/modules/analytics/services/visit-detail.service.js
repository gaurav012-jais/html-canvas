import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { ApiCallLog } from '../../../database/entities/api-call-log.entity.js';
import { campaignsService } from '../../campaigns/campaigns.service.js';
import { maskPhone } from './visit-tracking.service.js';
import { derivePagePath } from './page-path.helper.js';

const getVisitRepo = () => getRepository(Visit);
const getApiCallLogRepo = () => getRepository(ApiCallLog);

export { derivePagePath };

export const parseJsonSafe = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const checksubStatusLabel = (body, success) => {
  const nested = body?.data ?? body ?? {};
  const current = String(nested.currentStatus || '')
    .trim()
    .toLowerCase();
  const sub = String(nested.subscriptionStatus || '')
    .trim()
    .toLowerCase();
  // Prefer partner body (covers older logs that wrongly stored success=false for "new")
  if (current === 'active' || sub === 'active') return 'ACTIVE';
  if (current) return current.toUpperCase();
  if (sub) return sub.toUpperCase();
  const code = body?.responseCode;
  if (code === '0' || code === 0) return 'SUCCESS';
  if (success === false) return 'FAILED';
  return success ? 'SUCCESS' : 'FAILED';
};

export const getVisitDetail = async (visitId, userId) => {
  const id = parseInt(visitId, 10);
  if (!id) {
    const err = new Error('Invalid visit id');
    err.statusCode = 400;
    throw err;
  }

  const visit = await getVisitRepo().findOne({
    where: { id },
    relations: { events: true },
  });
  if (!visit) {
    const err = new Error('Visit not found');
    err.statusCode = 404;
    throw err;
  }

  let campaignName = null;
  if (visit.campaignId) {
    const campaign = await campaignsService.assertOwnership(
      visit.campaignId,
      userId,
    );
    campaignName = campaign?.name || null;
  } else {
    const err = new Error('Visit not found');
    err.statusCode = 404;
    throw err;
  }

  if (visit.events) {
    visit.events.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  const apiLogs = await getApiCallLogRepo().find({
    where: { visitId: id },
    order: { createdAt: 'ASC' },
  });

  const apiCalls = apiLogs.map((row) => {
    const responseBody = parseJsonSafe(row.responseBody);
    const requestBody = parseJsonSafe(row.requestBody);
    const nested = responseBody?.data ?? responseBody ?? {};
    let statusLabel =
      row.success === false
        ? 'FAILED'
        : row.success
          ? 'SUCCESS'
          : null;
    if (row.callType === 'checksub' || row.callType === 'delayed_checksub') {
      statusLabel = row.statusLabel || checksubStatusLabel(responseBody, row.success);
    } else if (row.callType === 'priority') {
      statusLabel = checksubStatusLabel(responseBody, row.success);
    } else if (
      row.callType === 'otp_send' ||
      row.callType === 'otp_verify' ||
      row.callType === 'otp_expose_send_in' ||
      row.callType === 'otp_expose_verify_in'
    ) {
      const nestedOtp = responseBody?.data ?? responseBody ?? {};
      if (nestedOtp.held === true || responseBody?.held === true) {
        statusLabel = 'HELD';
      } else {
        statusLabel =
          row.success === false
            ? 'FAILED'
            : nestedOtp.response
              ? String(nestedOtp.response).toUpperCase()
              : row.success
                ? 'SUCCESS'
                : null;
      }
    } else if (row.callType === 'subscribe' && responseBody?.skipped) {
      statusLabel =
        responseBody.statusLabel ||
        (requestBody?.reason === 'no_phone'
          ? 'NO_PHONE'
          : requestBody?.reason === 'test_fail'
            ? 'TEST_FAIL'
            : requestBody?.reason
              ? String(requestBody.reason).toUpperCase()
              : 'SKIPPED_NO_URL');
    } else if (row.callType === 'subscribe') {
      statusLabel =
        checksubStatusLabel(responseBody, row.success) || statusLabel;
    } else if (String(row.callType || '').startsWith('orange_bf_')) {
      const nestedBf = responseBody?.data ?? responseBody ?? {};
      if (nestedBf.subscriptionStatus) {
        statusLabel = String(nestedBf.subscriptionStatus).toUpperCase();
      } else if (responseBody?.outcome) {
        statusLabel = String(responseBody.outcome).toUpperCase();
      } else if (responseBody?.status) {
        statusLabel = String(responseBody.status).toUpperCase();
      } else if (row.success) {
        statusLabel = 'SUCCESS';
      } else {
        statusLabel = 'FAILED';
      }
    }
    return {
      id: row.id,
      callType: row.callType,
      eventType: `API_${String(row.callType || '').toUpperCase()}`,
      requestUrl: row.requestUrl,
      requestBody,
      responseStatus: row.responseStatus,
      responseBody,
      success: row.success,
      statusLabel,
      errorMessage: row.errorMessage,
      msisdn: row.msisdn || null,
      clickId: row.clickId,
      rcid: row.rcid,
      createdAt: row.createdAt,
      summary:
        row.callType === 'checksub' || row.callType === 'delayed_checksub' || row.callType === 'priority' || row.callType === 'orange_bf_checksub' || row.callType === 'orange_bf_expose_check_in'
          ? {
              currentStatus: nested.currentStatus ?? null,
              subscriptionStatus: nested.subscriptionStatus ?? null,
              serviceId: nested.serviceId ?? requestBody?.serviceId ?? null,
              responseCode: responseBody?.responseCode ?? null,
              responseMessage: responseBody?.responseMessage ?? null,
              transactionId: responseBody?.transactionId ?? nested.transactionId ?? null,
              priority: requestBody?.priority ?? null,
              pageType: requestBody?.pageType ?? null,
            }
          : row.callType === 'otp_send' ||
              row.callType === 'otp_verify' ||
              row.callType === 'otp_expose_send_in' ||
              row.callType === 'otp_expose_verify_in' ||
              row.callType === 'subscribe' ||
              String(row.callType || '').startsWith('orange_bf_')
            ? {
                response: nested.response ?? null,
                responseCode:
                  nested.responseCode ?? responseBody?.responseCode ?? null,
                responseMessage:
                  nested.responseMessage ||
                  nested.errorMessage ||
                  nested.message ||
                  responseBody?.responseMessage ||
                  null,
                transactionId: responseBody?.transactionId ?? nested.transactionId ?? null,
                skipped: nested.skipped ?? null,
                currentStatus: nested.currentStatus ?? null,
                subscriptionStatus: nested.subscriptionStatus ?? null,
                pack: requestBody?.pack || requestBody?.planId || null,
                serviceId:
                  requestBody?.serviceId || nested.serviceId || null,
                subServiceId: requestBody?.subServiceId || null,
              }
            : null,
    };
  });

  const events = (visit.events || []).map((e) => ({
    id: e.id,
    eventType: e.eventType,
    metadata: e.metadata || null,
    createdAt: e.createdAt,
    kind: 'event',
  }));

  const timeline = [
    ...events,
    ...apiCalls.map((c) => ({
      id: `api-${c.id}`,
      eventType: c.eventType,
      metadata: {
        callType: c.callType,
        statusLabel: c.statusLabel,
        summary: c.summary,
        responseStatus: c.responseStatus,
        requestUrl: c.requestUrl,
        requestBody: c.requestBody,
        responseBody: c.responseBody,
        errorMessage: c.errorMessage,
        msisdn: c.msisdn,
      },
      createdAt: c.createdAt,
      kind: 'api',
      apiCallId: c.id,
    })),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    visit: {
      id: visit.id,
      campaignId: visit.campaignId,
      campaignName,
      phoneMasked: maskPhone(visit.phone),
      phone: visit.phone || null,
      country: visit.country,
      operator: visit.operator,
      pageType: visit.pageType,
      visitStatus: visit.visitStatus,
      checksubStatus: visit.checksubStatus || null,
      checksubExecutedAt: visit.checksubExecutedAt || null,
      checksubResponse: visit.checksubResponse || null,
      clickId: visit.clickId,
      rcid: visit.rcid,
      campid: visit.campid || null,
      trackingCampid: visit.trackingCampid || null,
      vidRaw: visit.vidRaw,
      affRaw: visit.affRaw,
      vendorId: visit.vendorId,
      affiliateId: visit.affiliateId,
      ipAddress: visit.ipAddress,
      userAgent: visit.userAgent,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
    },
    events,
    apiCalls,
    timeline,
    pagePath: derivePagePath(visit),
  };
};

export const createVisitDetailService = () => ({
  parseJsonSafe,
  checksubStatusLabel,
  derivePagePath,
  getVisitDetail,
});

export const visitDetailService = createVisitDetailService();
