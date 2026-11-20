import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import {
  COLORS,
  FONTS,
  THIN_BORDER,
  addReportHeader,
  addTableHeader,
  formatDataRow,
} from './excel-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function main() {
  console.log('Connecting to database...');
  await client.connect();

  const septFilter = `
    (v.country ILIKE '%Burkina%' OR v.campaign_id = 17)
    AND v.created_at >= '2026-09-01 00:00:00+00'
    AND v.created_at < '2026-10-01 00:00:00+00'
  `;

  // 1. Fetch Vendor Map
  const vendorsQuery = await client.query('SELECT id, name FROM vendors');
  const vendorMap = {};
  vendorsQuery.rows.forEach((v) => {
    vendorMap[v.id] = v.name;
  });

  // 2. Fetch Overall September Summary
  console.log('Fetching September overall metrics...');
  const overallQuery = await client.query(`
    SELECT 
      COUNT(DISTINCT v.id) as total_visits,
      COUNT(DISTINCT v.ip_address) as unique_ips,
      COUNT(DISTINCT v.click_id) as unique_clicks,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.id END) as visits_with_phone,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as unique_phones,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'CONFIRM_VIEW' THEN v.id END) as confirm_views,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN ve.id END) as total_subscribe_clicks,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN v.id END) as unique_users_subscribe_click,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' AND v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as phones_clicking_subscribe,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'OTP_VERIFY' THEN v.id END) as otp_verified,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED' THEN v.id END) as subscribed_users,
      COUNT(DISTINCT CASE WHEN (ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED') AND v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as subscribed_phones,
      MIN(v.created_at) as earliest_visit,
      MAX(v.created_at) as latest_visit
    FROM visits v
    LEFT JOIN visit_events ve ON ve.visit_id = v.id
    WHERE ${septFilter}
  `);
  const overall = overallQuery.rows[0];

  // 3. Fetch Comprehensive Converted & OTP Verified Leads with ALL Fields
  console.log('Fetching detailed Converted & OTP Verified Leads...');
  const conversionsQuery = await client.query(`
    SELECT 
      v.id as visit_id,
      COALESCE(NULLIF(v.phone, ''), cp.msisdn) as phone_number,
      v.click_id,
      COALESCE(v.rcid, cp.rcid) as rcid,
      COALESCE(v.campid, cp.campid) as vendor_campid,
      COALESCE(v.tracking_campid, cp.tracking_campid, 'BF-OR-17') as tracking_campid,
      v.vid_raw as vendor_subid,
      v.vendor_id,
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as visit_time_utc,
      COALESCE(otp_ev.first_otp_time, TO_CHAR(v.otp_verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')) as otp_verified_time_utc,
      COALESCE(sub_ev.first_sub_time, TO_CHAR(v.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')) as conversion_time_utc,
      CASE WHEN otp_ev.first_otp_time IS NOT NULL OR v.otp_verified_at IS NOT NULL THEN 'Yes' ELSE 'No' END as is_otp_verified,
      CASE WHEN sub_ev.first_sub_time IS NOT NULL OR v.visit_status = 'SUBSCRIBED' OR v.visit_status = 'SUCCESS' THEN 'Yes' ELSE 'No' END as is_conversion,
      v.visit_status,
      cp.status as postback_status,
      cp.operator_status,
      cp.http_status as postback_http_status,
      TO_CHAR(cp.sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as postback_sent_time_utc,
      v.ip_address,
      v.user_agent,
      COALESCE(v.operator, 'Orange') as operator,
      COALESCE(v.country, 'Burkina Faso') as country
    FROM visits v
    LEFT JOIN (
      SELECT visit_id, TO_CHAR(MIN(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as first_otp_time
      FROM visit_events
      WHERE event_type = 'OTP_VERIFY'
      GROUP BY visit_id
    ) otp_ev ON otp_ev.visit_id = v.id
    LEFT JOIN (
      SELECT visit_id, TO_CHAR(MIN(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as first_sub_time
      FROM visit_events
      WHERE event_type = 'SUBSCRIBE_SUCCESS'
      GROUP BY visit_id
    ) sub_ev ON sub_ev.visit_id = v.id
    LEFT JOIN (
      SELECT DISTINCT ON (click_id) 
        click_id, rcid, campid, tracking_campid, status, msisdn, operator_status, http_status, sent_at
      FROM conversion_postbacks
      ORDER BY click_id, id DESC
    ) cp ON cp.click_id = v.click_id
    WHERE ${septFilter}
      AND (
        otp_ev.first_otp_time IS NOT NULL 
        OR sub_ev.first_sub_time IS NOT NULL 
        OR v.visit_status = 'SUBSCRIBED' 
        OR v.visit_status = 'SUCCESS'
        OR v.otp_verified_at IS NOT NULL
        OR cp.status = 'sent'
      )
    ORDER BY v.created_at DESC
  `);

  // 4. Fetch Daily Breakdown
  console.log('Fetching September daily stats...');
  const dailyQuery = await client.query(`
    SELECT 
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date_utc,
      COUNT(DISTINCT v.id) as total_visits,
      COUNT(DISTINCT v.ip_address) as unique_ips,
      COUNT(DISTINCT v.click_id) as unique_clicks,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.id END) as visits_with_phone,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as unique_phones,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'CONFIRM_VIEW' THEN v.id END) as confirm_views,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN ve.id END) as total_subscribe_clicks,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN v.id END) as unique_users_subscribe_click,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'OTP_VERIFY' THEN v.id END) as otp_verified,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED' THEN v.id END) as subscribed_users
    FROM visits v
    LEFT JOIN visit_events ve ON ve.visit_id = v.id
    WHERE ${septFilter}
    GROUP BY TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY date_utc ASC
  `);

  // 5. Fetch Detailed Subscribe Click Events
  console.log('Fetching September Subscribe Click details...');
  const subClicksQuery = await client.query(`
    SELECT 
      v.id as visit_id,
      TO_CHAR(MIN(ve.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as first_click_time_utc,
      v.phone,
      v.click_id,
      v.rcid,
      v.vendor_id,
      v.ip_address,
      v.visit_status,
      v.page_type,
      COUNT(ve.id) as subscribe_click_count,
      CASE WHEN MAX(CASE WHEN ve2.event_type = 'OTP_VERIFY' THEN 1 ELSE 0 END) = 1 THEN 'Yes' ELSE 'No' END as otp_verified,
      CASE WHEN v.visit_status = 'SUBSCRIBED' OR MAX(CASE WHEN ve2.event_type = 'SUBSCRIBE_SUCCESS' THEN 1 ELSE 0 END) = 1 THEN 'Yes' ELSE 'No' END as is_subscribed
    FROM visits v
    JOIN visit_events ve ON ve.visit_id = v.id AND ve.event_type = 'SUBSCRIBE_CLICK'
    LEFT JOIN visit_events ve2 ON ve2.visit_id = v.id
    WHERE ${septFilter}
    GROUP BY v.id, v.phone, v.click_id, v.rcid, v.vendor_id, v.ip_address, v.visit_status, v.page_type
    ORDER BY MIN(ve.created_at) DESC
  `);

  // 6. Fetch All Landing Page Visits
  console.log('Fetching September All Landing Page visits...');
  const allVisitsQuery = await client.query(`
    SELECT 
      v.id as visit_id,
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as visit_time_utc,
      v.phone,
      v.click_id,
      v.rcid,
      v.vendor_id,
      v.ip_address,
      v.visit_status,
      v.page_type,
      CASE WHEN ve.sub_clicks > 0 THEN 'Yes' ELSE 'No' END as clicked_subscribe,
      COALESCE(ve.sub_clicks, 0) as subscribe_clicks,
      CASE WHEN v.visit_status = 'SUBSCRIBED' OR ve.sub_success > 0 THEN 'Yes' ELSE 'No' END as is_subscribed
    FROM visits v
    LEFT JOIN (
      SELECT 
        visit_id, 
        COUNT(CASE WHEN event_type = 'SUBSCRIBE_CLICK' THEN 1 END) as sub_clicks,
        COUNT(CASE WHEN event_type = 'SUBSCRIBE_SUCCESS' THEN 1 END) as sub_success
      FROM visit_events
      GROUP BY visit_id
    ) ve ON ve.visit_id = v.id
    WHERE ${septFilter}
    ORDER BY v.created_at DESC
  `);

  // 7. Fetch September Vendor Breakdown
  console.log('Fetching September vendor breakdown...');
  const vendorBreakdownQuery = await client.query(`
    SELECT 
      v.vendor_id,
      COUNT(DISTINCT v.id) as total_visits,
      COUNT(DISTINCT v.ip_address) as unique_ips,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.id END) as visits_with_phone,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN ve.id END) as total_subscribe_clicks,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN v.id END) as unique_users_subscribe_click,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED' THEN v.id END) as subscribed_users
    FROM visits v
    LEFT JOIN visit_events ve ON ve.visit_id = v.id
    WHERE ${septFilter}
    GROUP BY v.vendor_id
    ORDER BY total_visits DESC
  `);

  await client.end();
  console.log('All DB queries completed. Building Excel workbook for September...');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Analytics Engine';
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // SHEET 1: Executive Summary
  // --------------------------------------------------------------------------
  console.log('Writing Sheet 1: Executive Summary (September)...');
  const wsSummary = workbook.addWorksheet('Executive Summary', { views: [{ showGridLines: true }] });

  addReportHeader(wsSummary, {
    rangeTitle: 'B2:G2',
    title: 'BURKINA FASO (ORANGE) - SEPTEMBER 2026 PERFORMANCE REPORT',
    rangeSubtitle: 'B3:G3',
    subtitle: 'Report Period: September 2026 (01-Sep-2026 to 30-Sep-2026) | Operator: Orange Burkina Faso | Includes Converted / OTP Verified Details',
  });
  wsSummary.getRow(2).height = 40;
  wsSummary.getRow(3).height = 22;

  // Metadata Table
  const metaStartRow = 5;
  wsSummary.mergeCells(`B${metaStartRow}:C${metaStartRow}`);
  const metaHdr = wsSummary.getCell(`B${metaStartRow}`);
  metaHdr.value = 'CAMPAIGN CONFIGURATION (SEPTEMBER)';
  metaHdr.font = FONTS.HEADER_WHITE;
  metaHdr.fill = COLORS.ACCENT_FILL;

  const metadata = [
    ['Country', 'Burkina Faso (BF)'],
    ['Telecom Operator', 'Orange (Operator ID: 19)'],
    ['Campaign Name', 'HealthPortal_OBF'],
    ['Campaign ID', '17'],
    ['Tracking Campaign ID', 'BF-OR-17'],
    ['Verification Mode', 'ORANGE_BF (Direct Carrier Billing)'],
    ['Reporting Period', 'September 2026 (01-Sep to 30-Sep)'],
    ['Converted & OTP Verified Leads', `${conversionsQuery.rows.length.toLocaleString()} leads (with Phone, Click ID & RCID)`],
    ['Total Captured Phones (Sept)', `${Number(overall.visits_with_phone).toLocaleString()} visits (${Number(overall.unique_phones).toLocaleString()} unique)`],
    ['Total Click IDs Tracked (Sept)', `${Number(overall.unique_clicks).toLocaleString()} click IDs (100% tracked)`],
  ];

  metadata.forEach((row, i) => {
    const rIdx = metaStartRow + 1 + i;
    const cellKey = wsSummary.getCell(`B${rIdx}`);
    cellKey.value = row[0];
    cellKey.font = FONTS.BOLD;
    cellKey.fill = COLORS.KPI_LABEL_BG;
    cellKey.border = THIN_BORDER;

    const cellVal = wsSummary.getCell(`C${rIdx}`);
    cellVal.value = row[1];
    cellVal.border = THIN_BORDER;
    cellVal.font = FONTS.REGULAR;
  });

  // KPI Metrics Table
  const kpiStartRow = 5;
  wsSummary.mergeCells(`E${kpiStartRow}:G${kpiStartRow}`);
  const kpiHdr = wsSummary.getCell(`E${kpiStartRow}`);
  kpiHdr.value = 'SEPTEMBER 2026 PERFORMANCE METRICS';
  kpiHdr.font = FONTS.HEADER_WHITE;
  kpiHdr.fill = COLORS.ACCENT_FILL;

  const totalVisits = Number(overall.total_visits);
  const uniqueIps = Number(overall.unique_ips);
  const totalSubClicks = Number(overall.total_subscribe_clicks);
  const uniqueSubClicks = Number(overall.unique_users_subscribe_click);
  const confirmViews = Number(overall.confirm_views);
  const otpVerified = Number(overall.otp_verified);
  const subUsers = Number(overall.subscribed_users);

  const kpis = [
    ['September Landing Visits (Traffic / Clicks)', totalVisits, '#,##0', 'Total landing page pageviews/clicks in Sept'],
    ['Unique Visitors (Distinct IP Addresses)', uniqueIps, '#,##0', 'Distinct individual IPs reached in Sept'],
    ['Unique Ad Click IDs (Tracking Clicks)', Number(overall.unique_clicks), '#,##0', 'Unique incoming click IDs tracked in Sept'],
    ['Total Subscribe Button Clicks', totalSubClicks, '#,##0', 'Total times "Subscribe" CTA was clicked'],
    ['Unique Users Clicking Subscribe Button', uniqueSubClicks, '#,##0', 'Unique visitors that clicked Subscribe'],
    ['Subscribe Click-Through Rate (CTR %)', totalSubClicks / (totalVisits || 1), '0.00%', 'Subscribe Clicks ÷ Landing Visits'],
    ['OTP Verifications (Pin Completed)', otpVerified, '#,##0', 'Users that completed OTP verification'],
    ['Total Subscribed Users (Conversions)', subUsers, '#,##0', 'Successfully billed / active subscribers'],
    ['Converted & OTP Verified Leads Total', conversionsQuery.rows.length, '#,##0', 'Total leads with OTP verify / conversion in Sept'],
    ['Overall Conversion Rate (% of Visits)', subUsers / (totalVisits || 1), '0.00%', 'Subscribed Users ÷ Landing Page Visits'],
    ['Conversion Rate (% of Subscribe Clicks)', subUsers / (totalSubClicks || 1), '0.00%', 'Subscribed Users ÷ Subscribe Clicks'],
  ];

  kpis.forEach((row, i) => {
    const rIdx = kpiStartRow + 1 + i;
    const kCell = wsSummary.getCell(`E${rIdx}`);
    kCell.value = row[0];
    kCell.font = FONTS.BOLD;
    kCell.fill = i === 0 || i === 3 || i === 7 || i === 8 ? COLORS.NOTE_BG : COLORS.KPI_LABEL_BG;
    kCell.border = THIN_BORDER;

    const vCell = wsSummary.getCell(`F${rIdx}`);
    vCell.value = row[1];
    vCell.numFmt = row[2];
    vCell.font = { bold: true, size: 11, color: { argb: i === 0 || i === 3 || i === 7 || i === 8 ? '0369A1' : '0F172A' } };
    vCell.alignment = { horizontal: 'right' };
    vCell.border = THIN_BORDER;

    const nCell = wsSummary.getCell(`G${rIdx}`);
    nCell.value = row[3];
    nCell.font = FONTS.MUTED;
    nCell.border = THIN_BORDER;
  });

  // Funnel Table
  const funnelStartRow = 19;
  wsSummary.mergeCells(`B${funnelStartRow}:G${funnelStartRow}`);
  const fHdr = wsSummary.getCell(`B${funnelStartRow}`);
  fHdr.value = 'SEPTEMBER CONVERSION FUNNEL (LANDING TO SUBSCRIPTION)';
  fHdr.font = FONTS.HEADER_WHITE;
  fHdr.fill = COLORS.HEADER_FILL;

  const funnelHeaders = ['Stage', 'Funnel Step Description', 'Volume', '% of Landing Visits', '% of Previous Step', 'Drop-off Volume'];
  funnelHeaders.forEach((h, idx) => {
    const colLetter = String.fromCharCode(66 + idx);
    const cell = wsSummary.getCell(`${colLetter}${funnelStartRow + 1}`);
    cell.value = h;
    cell.font = FONTS.HEADER_WHITE;
    cell.fill = COLORS.ACCENT_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: idx >= 2 ? 'right' : 'left' };
  });

  const funnelSteps = [
    ['Stage 1', 'Landing Page Visits (Ad Traffic)', totalVisits, 1.0, 1.0, 0],
    ['Stage 2', 'Confirm / Action Page Rendered', confirmViews, confirmViews / (totalVisits || 1), confirmViews / (totalVisits || 1), totalVisits - confirmViews],
    ['Stage 3', 'Subscribe Button Click (Unique Users)', uniqueSubClicks, uniqueSubClicks / (totalVisits || 1), uniqueSubClicks / (confirmViews || 1), confirmViews - uniqueSubClicks],
    ['Stage 4', 'OTP Verification Completed', otpVerified, otpVerified / (totalVisits || 1), otpVerified / (uniqueSubClicks || 1), uniqueSubClicks - otpVerified],
    ['Stage 5', 'Successful Subscriptions (Conversions)', subUsers, subUsers / (totalVisits || 1), subUsers / (otpVerified || 1), otpVerified - subUsers],
  ];

  funnelSteps.forEach((fs, i) => {
    const rIdx = funnelStartRow + 2 + i;
    const b = wsSummary.getCell(`B${rIdx}`);
    b.value = fs[0];
    b.font = FONTS.BOLD;
    b.border = THIN_BORDER;

    const c = wsSummary.getCell(`C${rIdx}`);
    c.value = fs[1];
    c.border = THIN_BORDER;

    const d = wsSummary.getCell(`D${rIdx}`);
    d.value = fs[2];
    d.numFmt = '#,##0';
    d.border = THIN_BORDER;
    d.alignment = { horizontal: 'right' };

    const e = wsSummary.getCell(`E${rIdx}`);
    e.value = fs[3];
    e.numFmt = '0.00%';
    e.border = THIN_BORDER;
    e.alignment = { horizontal: 'right' };

    const f = wsSummary.getCell(`F${rIdx}`);
    f.value = fs[4];
    f.numFmt = '0.00%';
    f.border = THIN_BORDER;
    f.alignment = { horizontal: 'right' };

    const g = wsSummary.getCell(`G${rIdx}`);
    g.value = fs[5];
    g.numFmt = '#,##0';
    g.border = THIN_BORDER;
    g.alignment = { horizontal: 'right' };
  });

  wsSummary.getColumn('A').width = 4;
  wsSummary.getColumn('B').width = 24;
  wsSummary.getColumn('C').width = 38;
  wsSummary.getColumn('D').width = 18;
  wsSummary.getColumn('E').width = 40;
  wsSummary.getColumn('F').width = 18;
  wsSummary.getColumn('G').width = 40;

  // --------------------------------------------------------------------------
  // SHEET 2: OTP Verified & Conversions
  // --------------------------------------------------------------------------
  console.log('Writing Sheet 2: OTP Verified & Conversions (Comprehensive Details)...');
  const wsConvDetails = workbook.addWorksheet('OTP Verified & Conversions', { views: [{ showGridLines: true }] });

  addReportHeader(wsConvDetails, {
    rangeTitle: 'A1:V1',
    title: 'SEPTEMBER 2026 - CONVERTED & OTP VERIFIED LEADS (BURKINA FASO ORANGE)',
    rangeSubtitle: 'A2:V2',
    subtitle: `Total Leads: ${conversionsQuery.rows.length.toLocaleString()} | Includes Captured Phone Numbers, Vendor RCID (Tracking Click ID), Funnel Click ID, Timestamps & Postback Status`,
  });
  wsConvDetails.getRow(1).height = 36;
  wsConvDetails.getRow(2).height = 20;
  wsConvDetails.addRow([]);

  const convDetailHeaders = [
    '#', 'Visit ID', 'Captured Mobile Number', 'Vendor RCID (Original Click ID)', 'Unique Funnel Click ID',
    'Vendor ID', 'Vendor Name', 'Vendor Camp ID', 'Tracking Camp ID', 'Vendor SubID', 'OTP Verified?',
    'Is Conversion?', 'Visit Time (UTC)', 'Visit Status', 'Postback Status', 'Operator Status',
    'Postback HTTP Status', 'Postback Sent Time', 'IP Address', 'User Agent / Device', 'Operator', 'Country',
  ];
  addTableHeader(wsConvDetails, convDetailHeaders, { fill: COLORS.HEADER_FILL });

  conversionsQuery.rows.forEach((r, idx) => {
    const row = wsConvDetails.addRow([
      idx + 1,
      r.visit_id,
      r.phone_number || '',
      r.rcid || '',
      r.click_id,
      r.vendor_id || '',
      vendorMap[r.vendor_id] || 'Unknown',
      r.vendor_campid || '',
      r.tracking_campid || '',
      r.vendor_subid || '',
      r.is_otp_verified,
      r.is_conversion,
      r.visit_time_utc,
      r.visit_status,
      r.postback_status || 'not_sent',
      r.operator_status || '',
      r.postback_http_status || '',
      r.postback_sent_time_utc || '',
      r.ip_address,
      r.user_agent,
      r.operator,
      r.country,
    ]);
    row.height = 20;

    const isConv = r.is_conversion === 'Yes';
    const isOtp = r.is_otp_verified === 'Yes';

    formatDataRow(row, {
      isZebra: idx % 2 === 1,
      alignments: {
        1: 'center', 2: 'center', 3: 'center', 6: 'center', 8: 'center', 9: 'center',
        11: 'center', 12: 'center', 13: 'center', 14: 'center', 15: 'center', 16: 'center',
        17: 'center', 18: 'center', 21: 'center', 22: 'center',
      },
      fonts: {
        3: FONTS.BOLD,
        4: FONTS.CODE,
        5: FONTS.CODE,
        11: isOtp ? FONTS.SUCCESS_BOLD : FONTS.REGULAR,
        12: isConv ? FONTS.SUCCESS_BOLD : FONTS.REGULAR,
        15: r.postback_status === 'sent' ? FONTS.SUCCESS_BOLD : FONTS.REGULAR,
        19: FONTS.CODE,
        20: FONTS.MUTED,
      },
      fills: isConv ? { 3: COLORS.SUCCESS_BG, 12: COLORS.SUCCESS_BG } : isOtp ? { 3: COLORS.WARNING_BG, 11: COLORS.WARNING_BG } : {},
    });
  });

  const convColWidths = [6, 12, 22, 38, 30, 10, 24, 16, 16, 14, 14, 14, 20, 16, 16, 16, 18, 20, 18, 40, 12, 14];
  convColWidths.forEach((w, i) => {
    wsConvDetails.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // SHEET 3: Daily Breakdown
  // --------------------------------------------------------------------------
  console.log('Writing Sheet 3: Daily Breakdown (September)...');
  const wsDaily = workbook.addWorksheet('Daily Breakdown', { views: [{ showGridLines: true }] });

  addReportHeader(wsDaily, {
    rangeTitle: 'A1:N1',
    title: 'SEPTEMBER 2026 - DAILY PERFORMANCE BREAKDOWN (BURKINA FASO ORANGE)',
    rangeSubtitle: 'A2:N2',
    subtitle: 'Daily Funnel Progress from Landing Page Visits to Subscribed Conversions',
  });
  wsDaily.getRow(1).height = 36;
  wsDaily.getRow(2).height = 20;
  wsDaily.addRow([]);

  const dailyHeaders = [
    'Date (UTC)', 'Total Visits', 'Unique IPs', 'Unique Clicks', 'Phones Captured', 'Unique Phones',
    'Confirm Views', 'Total Subscribe Clicks', 'Unique Users Sub Click', 'OTP Verified', 'Subscribed Users',
    'Click -> Sub Click %', 'Sub Click -> Sub %', 'Overall CR %',
  ];
  addTableHeader(wsDaily, dailyHeaders, { fill: COLORS.HEADER_FILL });

  let sumVisits = 0, sumIps = 0, sumClicks = 0, sumPhones = 0, sumUniquePhones = 0;
  let sumConfirm = 0, sumSubClicks = 0, sumUniqueSubClicks = 0, sumOtp = 0, sumSub = 0;

  dailyQuery.rows.forEach((r, idx) => {
    const visits = Number(r.total_visits);
    const ips = Number(r.unique_ips);
    const clicks = Number(r.unique_clicks);
    const phones = Number(r.visits_with_phone);
    const uPhones = Number(r.unique_phones);
    const conf = Number(r.confirm_views);
    const subClicks = Number(r.total_subscribe_clicks);
    const uSubClicks = Number(r.unique_users_subscribe_click);
    const otp = Number(r.otp_verified);
    const sub = Number(r.subscribed_users);

    sumVisits += visits;
    sumIps += ips;
    sumClicks += clicks;
    sumPhones += phones;
    sumUniquePhones += uPhones;
    sumConfirm += conf;
    sumSubClicks += subClicks;
    sumUniqueSubClicks += uSubClicks;
    sumOtp += otp;
    sumSub += sub;

    const row = wsDaily.addRow([
      r.date_utc, visits, ips, clicks, phones, uPhones, conf, subClicks, uSubClicks, otp, sub,
      visits > 0 ? subClicks / visits : 0,
      subClicks > 0 ? sub / subClicks : 0,
      visits > 0 ? sub / visits : 0,
    ]);
    row.height = 20;

    row.getCell(12).numFmt = '0.00%';
    row.getCell(13).numFmt = '0.00%';
    row.getCell(14).numFmt = '0.00%';

    formatDataRow(row, {
      isZebra: idx % 2 === 1,
      alignments: {
        1: 'center', 2: 'right', 3: 'right', 4: 'right', 5: 'right', 6: 'right',
        7: 'right', 8: 'right', 9: 'right', 10: 'right', 11: 'right', 12: 'right', 13: 'right', 14: 'right',
      },
      fonts: { 1: FONTS.BOLD, 11: sub > 0 ? FONTS.SUCCESS_BOLD : FONTS.REGULAR },
    });
  });

  const dailyTotalRow = wsDaily.addRow([
    'TOTAL (SEPTEMBER)', sumVisits, sumIps, sumClicks, sumPhones, sumUniquePhones,
    sumConfirm, sumSubClicks, sumUniqueSubClicks, sumOtp, sumSub,
    sumVisits > 0 ? sumSubClicks / sumVisits : 0,
    sumSubClicks > 0 ? sumSub / sumSubClicks : 0,
    sumVisits > 0 ? sumSub / sumVisits : 0,
  ]);
  dailyTotalRow.height = 24;
  dailyTotalRow.eachCell((cell, col) => {
    cell.font = FONTS.BOLD;
    cell.fill = COLORS.NOTE_BG;
    cell.border = THIN_BORDER;
    if (col >= 12) cell.numFmt = '0.00%';
    cell.alignment = { horizontal: col === 1 ? 'center' : 'right', vertical: 'middle' };
  });

  const dailyColWidths = [14, 14, 14, 14, 16, 16, 16, 20, 22, 14, 16, 20, 20, 16];
  dailyColWidths.forEach((w, i) => {
    wsDaily.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // SHEET 4: Subscribe Clicks Data
  // --------------------------------------------------------------------------
  console.log('Writing Sheet 4: Subscribe Clicks Data...');
  const wsSubClicks = workbook.addWorksheet('Subscribe Clicks Data', { views: [{ showGridLines: true }] });

  addReportHeader(wsSubClicks, {
    rangeTitle: 'A1:L1',
    title: 'SEPTEMBER 2026 - DETAILED SUBSCRIBE BUTTON CLICKS LOG',
    rangeSubtitle: 'A2:L2',
    subtitle: `Total Clicks: ${subClicksQuery.rows.length.toLocaleString()} | Log of Visitors Clicking the Subscribe / CTA Button`,
  });
  wsSubClicks.getRow(1).height = 36;
  wsSubClicks.getRow(2).height = 20;
  wsSubClicks.addRow([]);

  const subClickHeaders = [
    '#', 'Visit ID', 'First Click Time (UTC)', 'Phone Number', 'Click ID', 'RCID',
    'Vendor ID', 'Vendor Name', 'IP Address', 'Page Type', 'Subscribe Click Count', 'Subscribed?',
  ];
  addTableHeader(wsSubClicks, subClickHeaders, { fill: COLORS.HEADER_FILL });

  subClicksQuery.rows.forEach((r, idx) => {
    const isSub = r.is_subscribed === 'Yes';
    const row = wsSubClicks.addRow([
      idx + 1, r.visit_id, r.first_click_time_utc, r.phone || '', r.click_id, r.rcid || '',
      r.vendor_id || '', vendorMap[r.vendor_id] || 'Unknown', r.ip_address, r.page_type || 'HOME',
      Number(r.subscribe_click_count), r.is_subscribed,
    ]);
    row.height = 20;

    formatDataRow(row, {
      isZebra: idx % 2 === 1,
      alignments: { 1: 'center', 2: 'center', 3: 'center', 7: 'center', 10: 'center', 11: 'right', 12: 'center' },
      fonts: {
        4: r.phone ? FONTS.BOLD : FONTS.REGULAR,
        5: FONTS.CODE,
        6: FONTS.CODE,
        9: FONTS.CODE,
        12: isSub ? FONTS.SUCCESS_BOLD : FONTS.REGULAR,
      },
      fills: isSub ? { 4: COLORS.SUCCESS_BG, 12: COLORS.SUCCESS_BG } : {},
    });
  });

  const subClickWidths = [6, 12, 20, 20, 30, 36, 10, 24, 18, 14, 20, 14];
  subClickWidths.forEach((w, i) => {
    wsSubClicks.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // SHEET 5: All Landing Visits Log
  // --------------------------------------------------------------------------
  console.log('Writing Sheet 5: All Landing Page Visits Log...');
  const wsAllVisits = workbook.addWorksheet('All Landing Visits Log', { views: [{ showGridLines: true }] });

  addReportHeader(wsAllVisits, {
    rangeTitle: 'A1:K1',
    title: 'SEPTEMBER 2026 - COMPLETE LANDING PAGE VISITS LOG',
    rangeSubtitle: 'A2:K2',
    subtitle: `Total Visits: ${allVisitsQuery.rows.length.toLocaleString()} | Telemetry Records for September 2026`,
  });
  wsAllVisits.getRow(1).height = 36;
  wsAllVisits.getRow(2).height = 20;
  wsAllVisits.addRow([]);

  const allVisitHeaders = [
    '#', 'Visit ID', 'Visit Time (UTC)', 'Phone Number', 'Click ID', 'RCID',
    'Vendor ID', 'Vendor Name', 'IP Address', 'Clicked Subscribe?', 'Subscribe Clicks Count',
  ];
  addTableHeader(wsAllVisits, allVisitHeaders, { fill: COLORS.HEADER_FILL });

  allVisitsQuery.rows.forEach((r, idx) => {
    const row = wsAllVisits.addRow([
      idx + 1, r.visit_id, r.visit_time_utc, r.phone || '', r.click_id, r.rcid || '',
      r.vendor_id || '', vendorMap[r.vendor_id] || 'Unknown', r.ip_address,
      r.clicked_subscribe, Number(r.subscribe_clicks),
    ]);
    row.height = 20;

    formatDataRow(row, {
      isZebra: idx % 2 === 1,
      alignments: { 1: 'center', 2: 'center', 3: 'center', 7: 'center', 10: 'center', 11: 'right' },
      fonts: {
        4: r.phone ? FONTS.BOLD : FONTS.REGULAR,
        5: FONTS.CODE,
        6: FONTS.CODE,
        9: FONTS.CODE,
        10: r.clicked_subscribe === 'Yes' ? FONTS.SUCCESS_BOLD : FONTS.REGULAR,
      },
    });
  });

  const allVisitWidths = [6, 12, 20, 20, 30, 36, 10, 24, 18, 18, 22];
  allVisitWidths.forEach((w, i) => {
    wsAllVisits.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // SHEET 6: Vendor & Traffic Source Breakdown
  // --------------------------------------------------------------------------
  console.log('Writing Sheet 6: Vendor Breakdown...');
  const wsVendor = workbook.addWorksheet('Vendor & Traffic Source', { views: [{ showGridLines: true }] });

  addReportHeader(wsVendor, {
    rangeTitle: 'A1:H1',
    title: 'SEPTEMBER 2026 - VENDOR & TRAFFIC SOURCE BREAKDOWN',
    rangeSubtitle: 'A2:H2',
    subtitle: 'Traffic Performance, Subscribe Button Clicks and Conversions Segmented by Vendor Network',
  });
  wsVendor.getRow(1).height = 36;
  wsVendor.getRow(2).height = 20;
  wsVendor.addRow([]);

  const vendorHeaders = [
    'Vendor ID', 'Vendor Name', 'Total Visits', 'Unique IPs', 'Phones Captured',
    'Subscribe Clicks', 'Subscribed Users', 'Conversion Rate %',
  ];
  addTableHeader(wsVendor, vendorHeaders, { fill: COLORS.HEADER_FILL });

  let vSumVisits = 0, vSumIps = 0, vSumPhones = 0, vSumClicks = 0, vSumSub = 0;

  vendorBreakdownQuery.rows.forEach((r, idx) => {
    const visits = Number(r.total_visits);
    const ips = Number(r.unique_ips);
    const phones = Number(r.visits_with_phone);
    const clicks = Number(r.total_subscribe_clicks);
    const sub = Number(r.subscribed_users);

    vSumVisits += visits;
    vSumIps += ips;
    vSumPhones += phones;
    vSumClicks += clicks;
    vSumSub += sub;

    const row = wsVendor.addRow([
      r.vendor_id || 'N/A', vendorMap[r.vendor_id] || 'Direct / Organic',
      visits, ips, phones, clicks, sub, visits > 0 ? sub / visits : 0,
    ]);
    row.height = 20;
    row.getCell(8).numFmt = '0.00%';

    formatDataRow(row, {
      isZebra: idx % 2 === 1,
      alignments: { 1: 'center', 2: 'left', 3: 'right', 4: 'right', 5: 'right', 6: 'right', 7: 'right', 8: 'right' },
      fonts: { 2: FONTS.BOLD, 7: sub > 0 ? FONTS.SUCCESS_BOLD : FONTS.REGULAR },
    });
  });

  const vendorTotalRow = wsVendor.addRow([
    'TOTAL', 'All Vendors Combined', vSumVisits, vSumIps, vSumPhones, vSumClicks, vSumSub,
    vSumVisits > 0 ? vSumSub / vSumVisits : 0,
  ]);
  vendorTotalRow.height = 24;
  vendorTotalRow.eachCell((cell, col) => {
    cell.font = FONTS.BOLD;
    cell.fill = COLORS.NOTE_BG;
    cell.border = THIN_BORDER;
    if (col === 8) cell.numFmt = '0.00%';
    cell.alignment = { horizontal: col <= 2 ? 'center' : 'right', vertical: 'middle' };
  });

  const vendorWidths = [12, 28, 16, 16, 18, 18, 18, 18];
  vendorWidths.forEach((w, i) => {
    wsVendor.getColumn(i + 1).width = w;
  });

  const outputPath = path.resolve(__dirname, '../../../Burkina_Faso_Orange_September_2026_Report.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Report successfully written to ${outputPath}`);
}

main().catch(console.error);
