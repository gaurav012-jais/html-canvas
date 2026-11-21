import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
} from '../../../common/zoned-day.js';
import { formatInZone, csvCell } from './day-report-constants.js';

/** Spreadsheet export — one row per MSISDN. */
export function formatDayReportCsv(report, timezone) {
  const tz = normalizeTimezone(timezone || report.timezone || DEFAULT_TIMEZONE);
  const headers = [
    'msisdn',
    'queued',
    'queued_at',
    'status',
    'billing_received',
    'billing_received_at',
    'vendor_fired',
    'vendor_fire_status',
    'vendor_fired_at',
    'vendor_http',
    'vendor_name',
    'vendor_code',
    'campaign',
    'click_id',
    'rcid',
    'campid',
    'tracking_campid',
    'visit_id',
    'postback_id',
    'outcome',
    'verdict',
    'cg_url',
    'he_error',
    'msisdn_received',
    'unmatched',
  ];
  const rows = [headers.join(',')];
  for (const n of report.numbers || []) {
    rows.push(
      [
        n.msisdn,
        n.queued ? 'YES' : 'NO',
        formatInZone(n.queuedAt, tz),
        n.status || '',
        n.billingReceived ? 'YES' : 'NO',
        formatInZone(n.billingReceivedAt, tz),
        n.vendorFired ? 'YES' : 'NO',
        n.vendorFireStatus || '',
        formatInZone(n.vendorFiredAt, tz),
        n.vendorHttp ?? '',
        n.vendorName || '',
        n.vendorCode || '',
        n.campaignName || '',
        n.clickId || '',
        n.rcid || '',
        n.campid || '',
        n.trackingCampid || '',
        n.visitId ?? '',
        n.postbackId ?? '',
        n.outcome || '',
        n.outcomeLabel || '',
        n.cgUrl || '',
        n.heError || '',
        n.msisdnReceived ? 'YES' : 'NO',
        n.unmatched ? 'YES' : 'NO',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `\uFEFF${rows.join('\n')}\n`;
}
