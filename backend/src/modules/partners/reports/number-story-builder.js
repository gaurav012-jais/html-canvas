import { ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import {
  digitsMsisdn,
  parseLogJson,
  isUnmatchedBillingLog,
  isHeFailCgRedirect,
  storyRowKey,
  clip,
  ts,
  pickLatest,
} from './day-report-constants.js';

/**
 * One MSISDN (or unresolved visit) → answers ops people actually ask:
 * queued? billing received? vendor fired? HE fail → CG?
 */
export function buildNumberStory({
  msisdn,
  postback = null,
  logs = [],
  events = [],
  vendor = null,
  campaign = null,
} = {}) {
  const billingLogs = logs.filter(
    (l) => l.callType === ApiCallType.BILLING_CALLBACK,
  );
  const vendorLogs = logs.filter(
    (l) => l.callType === ApiCallType.VENDOR_POSTBACK,
  );
  const callbackEvents = events.filter(
    (e) => e.eventType === VisitEventType.CALLBACK_RECEIVED,
  );
  const pendingEvents = events.filter(
    (e) => e.eventType === VisitEventType.POSTBACK_PENDING,
  );
  const failCgLog = pickLatest(
    logs.filter((l) => isHeFailCgRedirect(l)),
    (item) => ts(item.createdAt),
  );
  const failCgBody = parseLogJson(failCgLog?.requestBody);

  const status = String(postback?.status || '').toLowerCase();
  const queued = Boolean(postback) || pendingEvents.length > 0;

  const billingFromStatus =
    status === ConversionPostbackStatus.SENT ||
    status === ConversionPostbackStatus.FAILED;
  const billingReceived =
    billingLogs.length > 0 || callbackEvents.length > 0 || billingFromStatus;

  const latestBilling = pickLatest(
    [...billingLogs, ...callbackEvents],
    (item) => ts(item.createdAt),
  );
  const latestVendorLog = pickLatest(vendorLogs, (item) => ts(item.createdAt));

  const vendorFired =
    Boolean(postback?.sentAt) ||
    status === ConversionPostbackStatus.SENT ||
    status === ConversionPostbackStatus.FAILED ||
    status === ConversionPostbackStatus.SKIPPED ||
    vendorLogs.length > 0;

  let vendorFireStatus = 'none';
  if (
    status === ConversionPostbackStatus.SENT ||
    latestVendorLog?.success === true
  ) {
    vendorFireStatus = ConversionPostbackStatus.SENT;
  } else if (
    status === ConversionPostbackStatus.FAILED ||
    latestVendorLog?.success === false
  ) {
    vendorFireStatus = ConversionPostbackStatus.FAILED;
  } else if (status === ConversionPostbackStatus.SKIPPED) {
    vendorFireStatus = ConversionPostbackStatus.SKIPPED;
  } else if (vendorFired) {
    vendorFireStatus = status || 'fired';
  } else if (queued) {
    vendorFireStatus = ConversionPostbackStatus.PENDING;
  }

  const unmatchedLog = billingLogs.find((l) => isUnmatchedBillingLog(l));
  const unmatchedBody = parseLogJson(unmatchedLog?.requestBody);
  const unmatchedReason =
    unmatchedBody?.reason || unmatchedLog?.errorMessage || '';

  let outcome = 'not_queued';
  let outcomeLabel =
    'NOT QUEUED — no conversion_postbacks row. Vendor CPA was never armed for this number.';

  if (!queued && failCgLog) {
    outcome = 'he_fail_cg';
    outcomeLabel =
      'NO MSISDN → CG — HE token/resolve did not return a number. User was redirected to the CG / fail URL. No postback queued.';
  } else if (!queued && unmatchedLog) {
    outcome = 'callback_unmatched';
    outcomeLabel = unmatchedReason
      ? `UNMATCHED CALLBACK — operator hit /callback but ${unmatchedReason}.`
      : 'UNMATCHED CALLBACK — operator hit /callback; click_id / msisdn was not in our system. Vendor CPA was not fired.';
  } else if (!queued && billingReceived) {
    outcome = 'callback_no_row';
    outcomeLabel =
      'CALLBACK WITH NO QUEUE — operator hit /callback but there was no pending postback row for this MSISDN, so vendor CPA was not fired.';
  } else if (
    status === ConversionPostbackStatus.SENT ||
    vendorFireStatus === 'sent'
  ) {
    outcome = 'complete';
    outcomeLabel =
      'COMPLETE — billing callback received and vendor CPA postback fired successfully.';
  } else if (
    status === ConversionPostbackStatus.FAILED ||
    vendorFireStatus === 'failed'
  ) {
    outcome = 'fire_failed';
    outcomeLabel =
      'FIRE FAILED — billing callback received (or fire attempted) but vendor CPA HTTP failed.';
  } else if (status === ConversionPostbackStatus.SKIPPED) {
    outcome = 'skipped';
    outcomeLabel =
      'SKIPPED — queued, but vendor fire was skipped (usually no postback URL on vendor).';
  } else if (queued && !billingReceived) {
    outcome = 'waiting_callback';
    outcomeLabel =
      'WAITING — postback queued. Billing/operator callback not received yet. Vendor CPA not fired.';
  } else if (queued && billingReceived && !vendorFired) {
    outcome = 'waiting_fire';
    outcomeLabel =
      'CALLBACK RECEIVED — billing arrived but vendor CPA has not been marked fired yet.';
  } else if (queued) {
    outcome = 'waiting_callback';
    outcomeLabel =
      'WAITING — postback queued. Billing callback not confirmed. Vendor CPA not fired.';
  }

  const timeline = [
    ...logs.map((l) => ({
      at: l.createdAt || null,
      source: 'api_call_logs',
      type: l.callType,
      ok: l.success !== false,
      http: l.responseStatus ?? null,
      url: l.requestUrl || '',
      body: clip(l.responseBody || l.requestBody, 500),
      error: l.errorMessage || '',
      detail: [
        l.success === false ? 'FAILED' : 'OK',
        l.responseStatus != null ? `HTTP ${l.responseStatus}` : '',
        l.errorMessage || '',
      ]
        .filter(Boolean)
        .join('  '),
    })),
    ...events.map((e) => ({
      at: e.createdAt || null,
      source: 'visit_events',
      type: e.eventType,
      ok: e.eventType !== VisitEventType.POSTBACK_FAILED,
      http: null,
      url: '',
      body: clip(e.metadata, 400),
      error: '',
      detail: e.eventType,
    })),
  ].sort((a, b) => ts(a.at) - ts(b.at));

  const visitId =
    postback?.visitId || logs.find((l) => l.visitId)?.visitId || null;
  const clickId =
    postback?.clickId || logs.find((l) => l.clickId)?.clickId || null;
  const digits = digitsMsisdn(msisdn);

  return {
    msisdn: digits || String(msisdn || ''),
    rowKey: storyRowKey({
      msisdn: digits,
      visitId,
      clickId,
      postbackId: postback?.id,
    }),
    visitId,
    clickId,
    rcid: postback?.rcid || logs.find((l) => l.rcid)?.rcid || null,
    campid: postback?.campid || null,
    trackingCampid: postback?.trackingCampid || null,
    campaignId:
      postback?.campaignId ||
      campaign?.id ||
      logs.find((l) => l.campaignId)?.campaignId ||
      null,
    campaignName: campaign?.name || null,
    vendorId: postback?.vendorId || vendor?.id || null,
    vendorName: vendor?.name || null,
    vendorCode: vendor?.code || null,
    postbackId: postback?.id || null,
    redirectedToCg: Boolean(failCgLog),
    cgUrl: failCgLog?.requestUrl || '',
    heError:
      failCgLog?.errorMessage || failCgBody?.heError || failCgBody?.error || '',
    heProvider: failCgBody?.heProvider || '',
    heRedirectedAt: failCgLog?.createdAt || null,
    queued,
    queuedAt: postback?.createdAt || pendingEvents[0]?.createdAt || null,
    status: status || null,
    billingReceived,
    billingReceivedAt:
      latestBilling?.createdAt ||
      (billingFromStatus ? postback?.sentAt || postback?.updatedAt : null) ||
      null,
    billingHttp: latestBilling?.responseStatus ?? null,
    vendorFired,
    vendorFireStatus,
    vendorFiredAt: postback?.sentAt || latestVendorLog?.createdAt || null,
    vendorHttp: postback?.httpStatus ?? latestVendorLog?.responseStatus ?? null,
    vendorUrl: postback?.postbackUrl || latestVendorLog?.requestUrl || '',
    vendorResponse: clip(
      postback?.responseBody || latestVendorLog?.responseBody,
      800,
    ),
    vendorError: postback?.errorMessage || latestVendorLog?.errorMessage || '',
    outcome,
    outcomeLabel,
    unmatched: Boolean(unmatchedLog),
    unmatchedReason,
    msisdnReceived: Boolean(digits),
    timeline,
  };
}
