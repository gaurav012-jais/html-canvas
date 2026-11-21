import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
} from '../../../common/zoned-day.js';

export const DAY_REPORT_HE_LOG_TYPES = [
  ApiCallType.HE_REDIRECT,
  ApiCallType.HE_TOKEN,
  ApiCallType.HE_MSISDN,
  ApiCallType.HE_RESOLVE,
  ApiCallType.RESOLVE_MSISDN,
];

export const DAY_REPORT_HIT_TYPES = [
  ApiCallType.BILLING_CALLBACK,
  ApiCallType.VENDOR_POSTBACK,
];

export const DAY_REPORT_LOG_TYPES = [
  ...DAY_REPORT_HIT_TYPES,
  ApiCallType.CHECKSUB,
  ApiCallType.SUBSCRIBE,
  ...DAY_REPORT_HE_LOG_TYPES,
];

export const DAY_REPORT_EVENT_TYPES = [
  VisitEventType.POSTBACK_PENDING,
  VisitEventType.POSTBACK_SENT,
  VisitEventType.POSTBACK_FAILED,
  VisitEventType.CALLBACK_RECEIVED,
];

export const DAY_REPORT_MAX_NUMBERS = 1500;

export function digitsMsisdn(value) {
  return String(value || '').replace(/\D/g, '');
}

export function todayYmd(timezone, now = new Date()) {
  const tz = normalizeTimezone(timezone || DEFAULT_TIMEZONE);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function ymdInZone(date, timezone) {
  if (!date) return '';
  const formatted = formatInZone(date, timezone);
  return formatted ? formatted.slice(0, 10) : '';
}

export function formatInZone(date, timezone) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  const tz = normalizeTimezone(timezone || DEFAULT_TIMEZONE);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  const abbr = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' ? 'IST' : tz;
  return `${bag.year}-${bag.month}-${bag.day} ${bag.hour}:${bag.minute}:${bag.second} ${abbr}`;
}

export function yn(value) {
  return value ? 'YES' : 'NO ';
}

export function clip(value, max = 400) {
  if (value == null || value === '') return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export function ts(value) {
  if (!value) return 0;
  const n = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

export function pickLatest(items, getTime) {
  if (!items?.length) return null;
  return items.reduce((best, cur) => {
    const bt = getTime(best);
    const ct = getTime(cur);
    if (!ct) return best;
    if (!bt) return cur;
    return ct > bt ? cur : best;
  });
}

export function parseLogJson(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function isUnmatchedBillingLog(log) {
  if (!log || log.callType !== ApiCallType.BILLING_CALLBACK) return false;
  const body = parseLogJson(log.requestBody);
  if (body?.matched === false || body?.action === 'unmatched') return true;
  return log.success === false;
}

/** Token/API HE did not resolve MSISDN and we sent the user to CG / fail URL. */
export function isHeFailCgRedirect(log) {
  if (!log || log.callType !== ApiCallType.HE_REDIRECT) return false;
  if (log.success === false) return true;
  const body = parseLogJson(log.requestBody);
  return String(body?.outcome || '').toLowerCase() === 'fail';
}

export function storyRowKey({ msisdn, visitId, clickId, postbackId } = {}) {
  const digits = digitsMsisdn(msisdn);
  if (digits) return digits;
  if (visitId) return `visit:${visitId}`;
  if (clickId) return `click:${clickId}`;
  if (postbackId) return `pb:${postbackId}`;
  return 'unknown';
}

export function csvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
