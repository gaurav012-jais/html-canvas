import { ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
} from '../../../common/zoned-day.js';
import {
  DAY_REPORT_MAX_NUMBERS,
  formatInZone,
  ymdInZone,
  yn,
  clip,
  csvCell,
} from './day-report-constants.js';
import { summarizeHits, formatHitLogLine } from './day-report-hits.js';

export function summarizeStories(numbers = []) {
  const summary = {
    numbers: numbers.length,
    queued: 0,
    billingReceived: 0,
    billingMissing: 0,
    vendorSent: 0,
    vendorFailed: 0,
    vendorPending: 0,
    skipped: 0,
    notQueued: 0,
    callbackNoRow: 0,
    callbackUnmatched: 0,
    complete: 0,
    waitingCallback: 0,
    fireFailed: 0,
    heFailCg: 0,
  };
  for (const n of numbers) {
    if (n.outcome === 'he_fail_cg') {
      summary.heFailCg += 1;
      continue;
    }
    if (n.outcome === 'callback_unmatched') {
      summary.callbackUnmatched += 1;
      summary.billingReceived += 1;
      continue;
    }
    if (n.queued) summary.queued += 1;
    else summary.notQueued += 1;
    if (n.billingReceived) summary.billingReceived += 1;
    else summary.billingMissing += 1;
    if (n.vendorFireStatus === ConversionPostbackStatus.SENT)
      summary.vendorSent += 1;
    else if (n.vendorFireStatus === ConversionPostbackStatus.FAILED) {
      summary.vendorFailed += 1;
    } else if (n.vendorFireStatus === ConversionPostbackStatus.SKIPPED) {
      summary.skipped += 1;
    } else if (n.queued) {
      summary.vendorPending += 1;
    }
    if (n.outcome === 'complete') summary.complete += 1;
    else if (n.outcome === 'waiting_callback') summary.waitingCallback += 1;
    else if (n.outcome === 'fire_failed') summary.fireFailed += 1;
    else if (n.outcome === 'callback_no_row') summary.callbackNoRow += 1;
    else if (n.outcome === 'callback_unmatched') summary.callbackUnmatched += 1;
  }
  return summary;
}

export function formatDayReportText(report, timezone) {
  const tz = normalizeTimezone(timezone || report.timezone || DEFAULT_TIMEZONE);
  const lines = [];
  const bar = '='.repeat(80);
  const thin = '-'.repeat(80);
  const summary = report.summary || summarizeStories(report.numbers || []);
  const generated = formatInZone(report.generatedAt || new Date(), tz);

  lines.push(bar);
  lines.push('WAP MANAGER — POSTBACK DAY LOG  (source of truth for ops)');
  lines.push(`Date: ${report.date || ''}   timezone: ${tz}`);
  if (report.from && report.to && report.from !== report.to) {
    lines.push(`Range: ${report.from} → ${report.to}`);
  }
  lines.push(`Generated: ${generated}`);
  if (report.truncated) {
    lines.push(
      `NOTE: truncated to ${DAY_REPORT_MAX_NUMBERS} numbers (oldest extras dropped).`,
    );
  }
  lines.push(bar);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`  Numbers in this file     : ${summary.numbers}`);
  lines.push(`  Queued (postback row)    : ${summary.queued}`);
  lines.push(`  Billing callback YES     : ${summary.billingReceived}`);
  lines.push(`  Billing callback NO      : ${summary.billingMissing}`);
  lines.push(`  Vendor fire SENT         : ${summary.vendorSent}`);
  lines.push(`  Vendor fire FAILED       : ${summary.vendorFailed}`);
  lines.push(`  Vendor fire not yet      : ${summary.vendorPending}`);
  lines.push(`  Skipped                  : ${summary.skipped}`);
  lines.push(`  Complete (recv+fired OK) : ${summary.complete}`);
  lines.push(`  Waiting for callback     : ${summary.waitingCallback}`);
  lines.push(`  Fire failed              : ${summary.fireFailed}`);
  lines.push(`  Callback with no queue   : ${summary.callbackNoRow}`);
  lines.push(`  Unmatched callbacks      : ${summary.callbackUnmatched || 0}`);
  lines.push(`  Not queued at all        : ${summary.notQueued}`);
  lines.push(`  No MSISDN → CG redirect  : ${summary.heFailCg || 0}`);
  lines.push('');
  lines.push('EVERY HIT (callback + vendor fire, pass or fail)');
  lines.push(`  Hits in this file        : ${summary.hitCount || 0}`);
  lines.push(`  Billing callback hits    : ${summary.billingHits || 0}`);
  lines.push(`  Vendor postback hits     : ${summary.vendorHits || 0}`);
  lines.push(`  OK                       : ${summary.hitOk || 0}`);
  lines.push(`  FAILED                   : ${summary.hitFailed || 0}`);
  lines.push(`  UNMATCHED                : ${summary.unmatched || 0}`);
  lines.push(`  Number received          : ${summary.withMsisdn || 0}`);
  lines.push(`  Number missing           : ${summary.withoutMsisdn || 0}`);
  lines.push('');
  lines.push('HOW TO READ EACH NUMBER');
  lines.push('  1. QUEUED   — did we create a conversion_postbacks row?');
  lines.push('  2. RECEIVED — did billing/operator hit /api/flow/callback?');
  lines.push('  3. FIRED    — did we GET the vendor CPA postback URL?');
  lines.push('  NUMBER    — did the callback include an MSISDN?');
  lines.push(
    '  HE fail → CG — token/resolve returned no number; user sent to CG URL.',
  );
  lines.push('');

  const hits = report.hits || [];
  if (hits.length) {
    lines.push(bar);
    lines.push('HIT LOG  (one line per callback / vendor fire)');
    lines.push(bar);
    let lastDate = '';
    for (const hit of hits) {
      const day = hit.date || ymdInZone(hit.at, tz);
      if (day && day !== lastDate) {
        lines.push('');
        lines.push(`  --- ${day} ---`);
        lastDate = day;
      }
      lines.push(`  ${formatHitLogLine(hit, tz)}`);
    }
    lines.push('');
  }

  const numbers = report.numbers || [];
  if (!numbers.length && !hits.length) {
    lines.push(thin);
    lines.push('No postback / callback / vendor-fire activity for this date.');
    lines.push(thin);
    return `${lines.join('\n')}\n`;
  }
  if (!numbers.length) {
    return `${lines.join('\n')}\n`;
  }

  for (const n of numbers) {
    lines.push(bar);
    lines.push(
      `MSISDN  ${n.msisdn || (n.outcome === 'he_fail_cg' || !n.msisdnReceived ? '(no MSISDN)' : '(unknown)')}`,
    );
    lines.push(bar);
    lines.push(`  0. NUMBER     ${yn(n.msisdnReceived)}  ${n.msisdn || '—'}`);
    lines.push(
      `  1. QUEUED     ${yn(n.queued)}  ${formatInZone(n.queuedAt, tz) || '—'}  ${
        n.postbackId ? `row#${n.postbackId}` : 'no row'
      }  status=${n.status || '—'}`,
    );
    lines.push(
      `  2. RECEIVED   ${yn(n.billingReceived)}  ${
        formatInZone(n.billingReceivedAt, tz) || '—'
      }${n.billingHttp != null ? `  HTTP ${n.billingHttp}` : ''}`,
    );
    const fireWord =
      n.vendorFireStatus === 'sent'
        ? 'YES'
        : n.vendorFireStatus === 'failed'
          ? 'FAIL'
          : n.vendorFired
            ? 'YES'
            : 'NO ';
    lines.push(
      `  3. FIRED      ${fireWord}  ${formatInZone(n.vendorFiredAt, tz) || '—'}  ${
        n.vendorFireStatus
      }${n.vendorHttp != null ? `  HTTP ${n.vendorHttp}` : ''}`,
    );
    lines.push('');
    lines.push(`  Verdict: ${n.outcomeLabel}`);
    if (n.vendorName) {
      lines.push(
        `  Vendor: ${n.vendorName}${n.vendorCode ? ` (${n.vendorCode})` : ''}`,
      );
    }
    if (n.campaignName || n.campaignId || n.trackingCampid || n.campid) {
      lines.push(
        `  Campaign: ${n.campaignName || '—'}  id=${n.campaignId || '—'}  tracking_campid=${n.trackingCampid || '—'}  campid=${n.campid || '—'}`,
      );
    }
    lines.push(
      `  Visit: ${n.visitId != null ? `#${n.visitId}` : '—'}  click_id=${n.clickId || '—'}  rcid=${n.rcid || '—'}`,
    );
    if (n.redirectedToCg || n.cgUrl) {
      lines.push(
        `  CG redirect: ${formatInZone(n.heRedirectedAt, tz) || 'YES'}  ${n.cgUrl || '—'}`,
      );
    }
    if (n.heError) lines.push(`  HE error: ${n.heError}`);
    if (n.vendorUrl) lines.push(`  Vendor URL: ${n.vendorUrl}`);
    if (n.vendorError) lines.push(`  Vendor error: ${n.vendorError}`);
    if (n.vendorResponse)
      lines.push(`  Vendor response: ${clip(n.vendorResponse, 300)}`);
    lines.push('');
    lines.push('  Timeline:');
    if (!n.timeline?.length) {
      lines.push(
        '    (no api_call_logs / visit_events for this number on this date)',
      );
    } else {
      for (const ev of n.timeline) {
        const t = formatInZone(ev.at, tz) || '—';
        lines.push(
          `    ${t}  ${String(ev.type || '').padEnd(20)}  ${ev.detail || ''}`,
        );
        if (ev.url) lines.push(`      URL: ${ev.url}`);
        if (ev.error) lines.push(`      error: ${ev.error}`);
        if (
          ev.body &&
          (ev.type === ApiCallType.VENDOR_POSTBACK ||
            ev.type === ApiCallType.BILLING_CALLBACK)
        ) {
          lines.push(`      body: ${clip(ev.body, 240)}`);
        }
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

import { formatDayReportCsv } from './day-report-csv.js';

export { formatDayReportCsv };

export function emptyDayReport({ date, timezone, from, to, rangeClamped }) {
  const summary = { ...summarizeStories([]), ...summarizeHits([]) };
  const generatedAt = new Date().toISOString();
  return {
    date,
    timezone,
    from,
    to,
    generatedAt,
    truncated: false,
    rangeClamped: Boolean(rangeClamped),
    summary,
    numbers: [],
    hits: [],
    text: formatDayReportText(
      {
        date,
        timezone,
        from,
        to,
        generatedAt,
        truncated: false,
        summary,
        numbers: [],
        hits: [],
      },
      timezone,
    ),
  };
}
