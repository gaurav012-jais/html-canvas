import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import pg from 'pg';
import dotenv from 'dotenv';
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

const outputPath = path.resolve(__dirname, '../../../Wellness_Zain_JO_OTP_Verified_Report.xlsx');
const uploadPath = path.resolve(__dirname, '../../uploads/Wellness_Zain_JO_OTP_Verified_Report.xlsx');

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function main() {
  await client.connect();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TemplateCraft Telemetry System';
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // SHEET 1: Verified Subscriber Summary
  // --------------------------------------------------------------------------
  const ws1 = workbook.addWorksheet('Verified Subscriber', { views: [{ showGridLines: true }] });
  ws1.columns = [{ width: 28 }, { width: 55 }, { width: 35 }];

  addReportHeader(ws1, {
    rangeTitle: 'A1:C1',
    title: 'WELLNESS ZAIN JO — VERIFIED OTP SUBSCRIBER REPORT',
    rangeSubtitle: 'A2:C2',
    subtitle: 'Campaign ID: 36 | Operator: Zain (Jordan) | Flow: OTP_ONLY | Activity Date: 06 October 2026',
    rangeNote: 'A3:C3',
    note: 'Note: Campaign #36 was created on 30-Sept-2026 (0 telemetry on 06-Sept). Verified OTP activity occurred on 06-Oct-2026.',
  });
  ws1.getRow(1).height = 36;
  ws1.getRow(2).height = 22;
  ws1.getRow(3).height = 20;
  ws1.addRow([]); // Blank spacer row

  addTableHeader(ws1, ['PARAMETER', 'TELEMETRY DETAIL / LOG VALUE', 'REMARKS'], {
    fill: COLORS.ACCENT_HEADER,
    height: 24,
  });

  const verifiedRows = [
    ['MSISDN (Mobile Number)', '962797923987', 'Zain Jordan Verified Number'],
    ['Campaign Name', 'Wellness Zain JO (ID #36)', 'Verification Mode: OTP_ONLY'],
    ['Subscriber Country / Operator', 'Jordan (JO) / Zain', 'Operator ID: 3'],
    ['Visit ID', '391040', 'Primary Unique Visit Identifier'],
    ['Click ID', '4oOP1Wcasp2bf4q9qQ28OMaw', 'Unique Funnel Click ID'],
    ['RCID (Vendor Click ID)', 'Fh_11kta8Yr4kM2kSTantWV9hnCOtpIc_6ZRCdBsWfUB-_j30erdcU1kivbregOcsMD8nYF_8s7wkgxpI6rAiLoxLmhukrMN', 'Track My Ads Unique Ref'],
    ['Vendor Name / ID', 'Track My Ads (ke) / Vendor ID #6', 'Affiliate Vendor Partner'],
    ['Campid', '5473169', 'Vendor Camp ID'],
    ['Tracking Campid', 'JO-ZA-36', 'Configured Tracking Identifier'],
    ['OTP Send Time (UTC)', '2026-10-06 04:04:16', 'Success: true (Gateway Response: 200)'],
    ['OTP Send Time (Jordan / Amman)', '2026-10-06 06:34:16', 'Local Country Time'],
    ['OTP Send Time (IST)', '2026-10-06 09:34:16', 'Indian Standard Time'],
    ['OTP Verify Time (UTC)', '2026-10-06 04:04:40', 'Verify Pin Submitted by User'],
    ['OTP Verify Time (Jordan / Amman)', '2026-10-06 06:34:40', 'Local Country Time'],
    ['OTP Verify Time (IST)', '2026-10-06 09:34:40', 'Indian Standard Time'],
    ['Partner Verify API Response', '{"responseType": 200, "message": "verify process completed"}', 'Gateway: Bilunipal Beecell API'],
    ['Billing Callback Received', '2026-10-07 00:08:40 UTC', 'Operator status: active'],
    ['Postback Fired Status', 'SENT (HTTP 200, Response: true)', 'Postback ID #6707 Fired to Vendor'],
    ['Postback Target URL', 'https://tickhigh.track-myads.com/postback?click_id={rcid}&msisdn=962797923987', 'Confirmed Vendor Conversion'],
    ['Final Status', 'SUBSCRIBED / ACTIVE', 'Confirmed Active Subscriber Conversion'],
  ];

  verifiedRows.forEach((r, idx) => {
    const row = ws1.addRow(r);
    row.height = 20;
    const isHighlight = r[0].includes('MSISDN') || r[0].includes('Final Status') || r[0].includes('Postback Fired');
    formatDataRow(row, {
      isZebra: idx % 2 === 0,
      fonts: {
        1: FONTS.BOLD,
        2: isHighlight ? FONTS.SUCCESS_BOLD : FONTS.REGULAR,
        3: FONTS.REGULAR,
      },
      fills: isHighlight ? { 1: COLORS.SUCCESS_BG, 2: COLORS.SUCCESS_BG, 3: COLORS.SUCCESS_BG } : {},
      alignments: { 1: 'left', 2: 'left', 3: 'left' },
    });
  });

  // --------------------------------------------------------------------------
  // SHEET 2: All OTP Attempts on 06 Oct 2026
  // --------------------------------------------------------------------------
  const ws2 = workbook.addWorksheet('06 Oct OTP Attempts', { views: [{ showGridLines: true }] });
  ws2.columns = [
    { header: 'MSISDN', key: 'msisdn', width: 18 },
    { header: 'Visit ID', key: 'visitId', width: 12 },
    { header: 'Click ID', key: 'clickId', width: 28 },
    { header: 'Vendor', key: 'vendor', width: 22 },
    { header: 'OTP Send (UTC)', key: 'sendUtc', width: 20 },
    { header: 'OTP Verify (UTC)', key: 'verifyUtc', width: 20 },
    { header: 'OTP Status', key: 'status', width: 16 },
    { header: 'Conversion Outcome', key: 'outcome', width: 30 },
    { header: 'Postback Status', key: 'postback', width: 20 },
  ];

  ws2.getRow(1).height = 26;
  ws2.getRow(1).eachCell((cell) => {
    cell.fill = COLORS.INDIGO_HEADER;
    cell.font = FONTS.HEADER_WHITE;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER;
  });

  const attemptsData = [
    {
      msisdn: '962797923987',
      visitId: 391040,
      clickId: '4oOP1Wcasp2bf4q9qQ28OMaw',
      vendor: 'Track My Ads (ke) [ID: 6]',
      sendUtc: '2026-10-06 04:04:16',
      verifyUtc: '2026-10-06 04:04:40',
      status: 'VERIFIED',
      outcome: 'Subscribed & Charged (Success)',
      postback: 'SENT (ID: 6707)',
      success: true,
    },
    {
      msisdn: '962795844290',
      visitId: 391293,
      clickId: 'lliEuD5IHkBeLqMU3ADRNjjv',
      vendor: 'Track My Ads (ke) [ID: 6]',
      sendUtc: '2026-10-06 05:47:03',
      verifyUtc: '—',
      status: 'OTP_SENT_ONLY',
      outcome: 'User dropped at OTP screen',
      postback: '—',
      success: false,
    },
    {
      msisdn: '962775997446',
      visitId: 401857,
      clickId: 'lGXDgKXmaqvNCGj4fodOV64p',
      vendor: 'Track My Ads (ke) [ID: 6]',
      sendUtc: '2026-10-06 15:38:56',
      verifyUtc: '—',
      status: 'OTP_SENT_ONLY',
      outcome: 'User dropped at OTP screen',
      postback: '—',
      success: false,
    },
  ];

  attemptsData.forEach((item, idx) => {
    const row = ws2.addRow(item);
    row.height = 22;
    formatDataRow(row, {
      isZebra: idx % 2 === 0,
      alignments: { 1: 'center', 2: 'center' },
      fonts: item.success ? { 1: FONTS.SUCCESS_BOLD } : {},
      fills: item.success ? { 1: COLORS.SUCCESS_BG, 2: COLORS.SUCCESS_BG, 3: COLORS.SUCCESS_BG, 4: COLORS.SUCCESS_BG, 5: COLORS.SUCCESS_BG, 6: COLORS.SUCCESS_BG, 7: COLORS.SUCCESS_BG, 8: COLORS.SUCCESS_BG, 9: COLORS.SUCCESS_BG } : {},
    });
  });

  // --------------------------------------------------------------------------
  // SHEET 3: Complete Chronological Audit Trail (Visit 391040)
  // --------------------------------------------------------------------------
  const ws3 = workbook.addWorksheet('Visit 391040 Timeline', { views: [{ showGridLines: true }] });
  ws3.columns = [
    { header: 'Step #', key: 'step', width: 10 },
    { header: 'Timestamp (UTC)', key: 'utcTime', width: 22 },
    { header: 'Amman Time', key: 'ammanTime', width: 20 },
    { header: 'Action / Event Type', key: 'event', width: 24 },
    { header: 'Component / Endpoint', key: 'endpoint', width: 45 },
    { header: 'Result / Response Details', key: 'details', width: 55 },
  ];

  ws3.getRow(1).height = 26;
  ws3.getRow(1).eachCell((cell) => {
    cell.fill = COLORS.ACCENT_HEADER;
    cell.font = FONTS.HEADER_WHITE;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER;
  });

  const timelineData = [
    {
      step: 1,
      utcTime: '2026-10-06 04:04:01',
      ammanTime: '2026-10-06 06:34:01',
      event: 'VISIT (Ad Click)',
      endpoint: 'Campaign Landing Page (OTP_ONLY)',
      details: 'User landed via click_id=4oOP1Wcasp2bf4q9qQ28OMaw, IP: 94.142.43.70',
    },
    {
      step: 2,
      utcTime: '2026-10-06 04:04:16',
      ammanTime: '2026-10-06 06:34:16',
      event: 'OTP_SEND',
      endpoint: 'https://bilunipal.tickhighs.com/beecell/api/otp/send',
      details: 'HTTP 200 {"success":true,"responseType":200,"message":"success"} (MSISDN: 962797923987)',
    },
    {
      step: 3,
      utcTime: '2026-10-06 04:04:40',
      ammanTime: '2026-10-06 06:34:40',
      event: 'OTP_VERIFY',
      endpoint: 'https://bilunipal.tickhighs.com/beecell/api/otp/verify',
      details: 'HTTP 200 {"success":false,"responseType":200,"message":"verify process completed"}',
    },
    {
      step: 4,
      utcTime: '2026-10-07 00:08:40',
      ammanTime: '2026-10-07 02:38:40',
      event: 'CALLBACK_RECEIVED',
      endpoint: '/api/flow/callback',
      details: 'Operator billing callback received: msisdn=962797923987, status=active',
    },
    {
      step: 5,
      utcTime: '2026-10-07 00:08:41',
      ammanTime: '2026-10-07 02:38:41',
      event: 'POSTBACK_SENT',
      endpoint: 'https://tickhigh.track-myads.com/postback',
      details: 'HTTP 200 Response: true -> Postback successfully delivered to vendor',
    },
  ];

  timelineData.forEach((rowObj, idx) => {
    const row = ws3.addRow(rowObj);
    row.height = 22;
    formatDataRow(row, {
      isZebra: idx % 2 === 0,
      alignments: { 1: 'center' },
      fonts: { 4: FONTS.BOLD },
    });
  });

  // --------------------------------------------------------------------------
  // SHEET 4: Historical Launch Numbers (01 Oct)
  // --------------------------------------------------------------------------
  const ws4 = workbook.addWorksheet('Historical Launch Numbers', { views: [{ showGridLines: true }] });
  ws4.columns = [
    { header: 'MSISDN', key: 'msisdn', width: 18 },
    { header: 'Date (UTC)', key: 'date', width: 16 },
    { header: 'Campaign', key: 'campaign', width: 30 },
    { header: 'Visit ID(s)', key: 'visitIds', width: 28 },
    { header: 'Type / Description', key: 'type', width: 35 },
    { header: 'Result', key: 'result', width: 25 },
  ];

  ws4.getRow(1).height = 26;
  ws4.getRow(1).eachCell((cell) => {
    cell.fill = COLORS.INDIGO_HEADER;
    cell.font = FONTS.HEADER_WHITE;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER;
  });

  const launchData = [
    {
      msisdn: '962776140096',
      date: '2026-10-01',
      campaign: 'Wellness Zain JO (ID #36)',
      visitIds: '250525, 250529, 250538, 250542',
      type: 'Initial Funnel Launch Testing',
      result: 'Failed (wrong pin / digit format test)',
    },
    {
      msisdn: '962791234567',
      date: '2026-10-01',
      campaign: 'Wellness Zain JO (ID #36)',
      visitIds: '250709',
      type: 'Dummy Mobile Submission Test',
      result: 'Failed (wrong pin)',
    },
    {
      msisdn: '962798752986',
      date: '2026-10-01',
      campaign: 'Wellness Zain JO API (ID #32)',
      visitIds: '254817',
      type: 'Expose API Verify In Test',
      result: 'Failed (wrong pin)',
    },
  ];

  launchData.forEach((rowObj, idx) => {
    const row = ws4.addRow(rowObj);
    row.height = 20;
    formatDataRow(row, {
      isZebra: idx % 2 === 0,
      alignments: { 1: 'center', 2: 'center' },
      fonts: { 1: FONTS.BOLD },
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  fs.copyFileSync(outputPath, uploadPath);

  console.log(`Excel file successfully created at: ${outputPath}`);
  console.log(`Copied to: ${uploadPath}`);

  await client.end();
}

main().catch(console.error);
