import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { ConversionPostback } from '../../../database/entities/conversion-postback.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
} from '../../../common/zoned-day.js';
import { todayYmd } from '../../partners/helpers/postback-day-report.js';
import { flowEngineService } from '../../flow/core/engine.js';
import { resolveFlowOrBoth } from '../../flow/flows/index.js';
import {
  countFlowConversions,
  resolveConversionRule,
} from '../../flow/flows/conversion-rule.js';
import {
  eachYmd,
  emptyMetrics,
  flattenOperatorStatus,
} from '../helpers/daily-stats.js';
import { MAX_ROLLUP_DAYS } from './daily-rollup-manager.js';
import {
  getReport as defaultGetReport,
  resolveUserScope,
} from './daily-report.query.js';

const n = (value) => Number(value) || 0;

const getCampaignRepo = () => getRepository(Campaign);
const getPostbackRepo = () => getRepository(ConversionPostback);

export const getDashboardSummary = async (
  userId,
  query = {},
  { getReportFn = defaultGetReport } = {},
) => {
  const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
  let from = String(query.from || '').slice(0, 10);
  let to = String(query.to || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const span = Math.min(
      Math.max(Number(query.days) || 30, 1),
      MAX_ROLLUP_DAYS,
    );
    to = todayYmd(timezone);
    const dt = new Date(`${to}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - (span - 1));
    from = dt.toISOString().slice(0, 10);
  }

  const dateReport = await getReportFn(userId, {
    ...query,
    from,
    to,
    timezone,
    groupBy: 'date',
  });
  const vendorReport = await getReportFn(userId, {
    ...query,
    from,
    to,
    timezone,
    groupBy: 'vendor',
  });
  const campaignReport = await getReportFn(userId, {
    ...query,
    from,
    to,
    timezone,
    groupBy: 'campaign',
  });

  const totals = dateReport.totals || emptyMetrics();
  const scopedCampaigns = await getCampaignRepo().find({
    where: { userId },
    select: ['id', 'verificationMode', 'flowConfig'],
  });
  const ruleByCampaign = Object.fromEntries(
    scopedCampaigns.map((campaign) => {
      const flow = resolveFlowOrBoth(
        flowEngineService.normalizeMode(campaign.verificationMode),
      );
      const parsed = flowEngineService.parseFlowConfig(campaign.flowConfig);
      return [
        campaign.id,
        resolveConversionRule(flow, {
          apiExpose: flowEngineService.isApiExposeFlow(parsed),
        }),
      ];
    }),
  );

  let conversions = 0;
  for (const row of campaignReport.rows || []) {
    const cid = n(row.campaignId);
    conversions += countFlowConversions(
      row,
      ruleByCampaign[cid] || 'subscribe_or_callback',
    );
  }

  const byOperatorStatus = flattenOperatorStatus(dateReport.rows);
  const callbacksReceived =
    byOperatorStatus.reduce((sum, row) => sum + (Number(row.count) || 0), 0) ||
    n(totals.billingReceived) + n(totals.unmatchedCallbacks);
  const byDateMap = Object.fromEntries(
    (dateReport.rows || []).map((row) => [row.statDate, row]),
  );
  const byDate = eachYmd(dateReport.from, dateReport.to).map((statDate) => {
    const row = byDateMap[statDate];
    return {
      statDate,
      visits: n(row?.visits),
      msisdnResolved: n(row?.msisdnResolved),
      otpSend: n(row?.otpSend),
      otpVerify: n(row?.otpVerify),
      subscribeSuccess: n(row?.subscribeSuccess),
      subscribeFailed: n(row?.subscribeFailed),
      postbacksQueued: n(row?.postbacksQueued),
      pending: n(row?.pending),
      billingReceived: n(row?.billingReceived),
      vendorSent: n(row?.vendorSent),
      vendorFailed: n(row?.vendorFailed),
      skipped: n(row?.skipped),
      unmatchedCallbacks: n(row?.unmatchedCallbacks),
      heFailCg: n(row?.heFailCg),
    };
  });

  // Vendor Checksub / Quality breakdown
  let vendorQuality = [];
  try {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    const qb = getPostbackRepo()
      .createQueryBuilder('p')
      .leftJoin(Vendor, 'v', 'v.id = p.vendorId')
      .select('p.vendorId', 'vendorId')
      .addSelect("COALESCE(v.name, 'Direct')", 'vendorName')
      .addSelect('v.code', 'vendorCode')
      .addSelect('COUNT(*)', 'totalAttempts')
      .addSelect(
        `COUNT(CASE 
          WHEN (p.delayedChecksubStatus = 'completed' AND UPPER(COALESCE(p.delayedChecksubOutcome, '')) = 'ACTIVE')
            OR (p.delayedChecksubStatus = 'skipped' AND LOWER(COALESCE(p.operatorStatus, '')) = 'active')
          THEN 1 END)`,
        'checksubActive',
      )
      .addSelect(
        `COUNT(CASE 
          WHEN p.delayedChecksubStatus IN ('completed', 'failed')
            AND NOT ((p.delayedChecksubStatus = 'completed' AND UPPER(COALESCE(p.delayedChecksubOutcome, '')) = 'ACTIVE')
                 OR (p.delayedChecksubStatus = 'skipped' AND LOWER(COALESCE(p.operatorStatus, '')) = 'active'))
          THEN 1 END)`,
        'checksubParking',
      )
      .addSelect(
        "COUNT(CASE WHEN p.delayedChecksubStatus = 'pending' THEN 1 END)",
        'checksubPending',
      )
      .where('p.createdAt BETWEEN :from AND :to', {
        from: fromDate,
        to: toDate,
      });

    const { campaignIds, vendorIds } = await resolveUserScope(userId);
    if (campaignIds.length && vendorIds.length) {
      qb.andWhere(
        '(p.campaignId IN (:...campaignIds) OR p.vendorId IN (:...vendorIds))',
        {
          campaignIds,
          vendorIds,
        },
      );
    } else if (campaignIds.length) {
      qb.andWhere('p.campaignId IN (:...campaignIds)', { campaignIds });
    } else if (vendorIds.length) {
      qb.andWhere('p.vendorId IN (:...vendorIds)', { vendorIds });
    }

    const rawQuality = await qb
      .groupBy('p.vendorId')
      .addGroupBy('v.name')
      .addGroupBy('v.code')
      .getRawMany();

    const visitsByVendor = Object.fromEntries(
      (vendorReport.rows || []).map((r) => [r.vendorId, n(r.visits)]),
    );

    vendorQuality = rawQuality
      .map((r) => {
        const attempts = n(r.totalAttempts);
        const active = n(r.checksubActive);
        const parking = n(r.checksubParking);
        const grace = n(r.checksubGrace);
        const pending = n(r.checksubPending);
        const qualityPct =
          attempts > 0 ? Number(((active / attempts) * 100).toFixed(1)) : 0;
        return {
          vendorId: r.vendorId ? parseInt(r.vendorId, 10) : null,
          vendorName:
            r.vendorName || (r.vendorId ? `Vendor #${r.vendorId}` : 'Direct'),
          vendorCode: r.vendorCode || null,
          visits: visitsByVendor[r.vendorId] || 0,
          totalAttempts: attempts,
          checksubActive: active,
          checksubParking: parking,
          checksubGrace: grace,
          checksubPending: pending,
          qualityPct,
        };
      })
      .sort((a, b) => b.totalAttempts - a.totalAttempts);
  } catch (qErr) {
    console.warn(
      'Failed to compute vendorQuality in getDashboardSummary:',
      qErr.message,
    );
  }

  return {
    visits: n(totals.visits),
    conversions,
    msisdnResolved: n(totals.msisdnResolved),
    heFailCg: n(totals.heFailCg),
    otpSend: n(totals.otpSend),
    otpVerify: n(totals.otpVerify),
    subscribeSuccess: n(totals.subscribeSuccess),
    subscribeFailed: n(totals.subscribeFailed),
    postbacksCreated: n(totals.postbacksQueued),
    pending: n(totals.pending),
    received: n(totals.billingReceived),
    sent: n(totals.vendorSent),
    failed: n(totals.vendorFailed),
    skipped: n(totals.skipped),
    unmatchedCallbacks: n(totals.unmatchedCallbacks),
    callbacksReceived,
    byOperatorStatus,
    byDate,
    byVendor: (vendorReport.rows || [])
      .map((row) => ({
        vendorId: row.vendorId || null,
        vendorName: row.vendorName,
        vendorCode: row.vendorCode,
        visits: n(row.visits),
        pending: n(row.pending),
        received: n(row.billingReceived),
        sent: n(row.vendorSent),
        failed: n(row.vendorFailed),
        skipped: n(row.skipped),
        total: n(row.postbacksQueued),
      }))
      .sort((a, b) => b.total - a.total || b.visits - a.visits),
    vendorQuality,
    since: dateReport.from,
    until: dateReport.to,
    timezone: dateReport.timezone,
    source: dateReport.source,
    todayLive: Boolean(dateReport.todayLive),
  };
};
