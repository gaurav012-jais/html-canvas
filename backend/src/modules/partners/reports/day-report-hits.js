import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  digitsMsisdn,
  ymdInZone,
  formatInZone,
  parseLogJson,
  isUnmatchedBillingLog,
} from './day-report-constants.js';

export function buildCallbackHit(log, timezone) {
  const body = parseLogJson(log.requestBody) || {};
  const msisdn = digitsMsisdn(log.msisdn || body.msisdn);
  const unmatched = isUnmatchedBillingLog(log);
  const skipped =
    String(log.statusLabel || '').toUpperCase() === 'SKIPPED' ||
    body.skipped === true;
  const ok = log.success !== false && !unmatched && !skipped;
  let statusLabel = log.statusLabel || null;
  if (!statusLabel) {
    if (unmatched) statusLabel = 'UNMATCHED';
    else if (log.success === false) statusLabel = 'FAILED';
    else statusLabel = 'OK';
  }
  return {
    id: log.id || null,
    at: log.createdAt || null,
    date: ymdInZone(log.createdAt, timezone),
    callType: log.callType,
    ok,
    unmatched,
    skipped,
    msisdn,
    msisdnReceived: Boolean(msisdn),
    clickId: log.clickId || body.clickId || null,
    rcid: log.rcid || null,
    visitId: log.visitId || null,
    campaignId: log.campaignId || null,
    http: log.responseStatus ?? null,
    url: log.requestUrl || '',
    reason: body.reason || log.errorMessage || '',
    error: log.errorMessage || '',
    statusLabel,
    query: log.query || body.query || null,
  };
}

export function summarizeHits(hits = []) {
  const summary = {
    hitCount: hits.length,
    billingHits: 0,
    vendorHits: 0,
    hitOk: 0,
    hitFailed: 0,
    unmatched: 0,
    withMsisdn: 0,
    withoutMsisdn: 0,
  };
  for (const hit of hits) {
    if (hit.callType === ApiCallType.BILLING_CALLBACK) summary.billingHits += 1;
    else if (hit.callType === ApiCallType.VENDOR_POSTBACK)
      summary.vendorHits += 1;
    if (hit.unmatched) summary.unmatched += 1;
    else if (
      hit.skipped ||
      String(hit.statusLabel || '').toUpperCase() === 'SKIPPED'
    ) {
      summary.hitFailed += 1;
    } else if (hit.ok) summary.hitOk += 1;
    else summary.hitFailed += 1;
    if (hit.msisdnReceived) summary.withMsisdn += 1;
    else summary.withoutMsisdn += 1;
  }
  return summary;
}

export function formatHitLogLine(hit, timezone) {
  const when =
    formatInZone(hit.at || hit.createdAt || new Date(), timezone) || '—';
  const type = String(hit.callType || 'hit').padEnd(18);
  const status = String(
    hit.statusLabel || (hit.success === false ? 'FAILED' : 'OK'),
  ).padEnd(10);
  const number =
    hit.msisdn || hit.msisdnReceived
      ? `msisdn=${hit.msisdn || 'YES'}`
      : 'msisdn=NO';
  const click = `click=${hit.clickId || '—'}`;
  const visit = hit.visitId ? `visit=#${hit.visitId}` : 'visit=—';
  const http =
    hit.http != null || hit.responseStatus != null
      ? `HTTP ${hit.http ?? hit.responseStatus}`
      : '';
  const reason = hit.reason || hit.errorMessage || hit.error || '';
  let queryPart = '';
  if (hit.query && typeof hit.query === 'object') {
    try {
      queryPart = `query=${JSON.stringify(hit.query).slice(0, 400)}`;
    } catch {
      queryPart = '';
    }
  } else if (hit.query) {
    queryPart = `query=${String(hit.query).slice(0, 400)}`;
  }
  return [when, type, status, number, click, visit, http, reason, queryPart]
    .filter((part) => part !== '')
    .join('  ')
    .trimEnd();
}
