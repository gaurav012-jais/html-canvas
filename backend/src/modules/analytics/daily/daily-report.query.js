import { getRepository } from '../../../database/index.js';
import { DailyStat } from '../../../database/entities/daily-stat.entity.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
} from '../../../common/zoned-day.js';
import { todayYmd } from '../../partners/helpers/postback-day-report.js';
import {
  eachYmd,
  emptyMetrics,
  groupStatsRows,
  parseOperatorStatusMap,
  totalsFromRows,
} from '../helpers/daily-stats.js';
import {
  MAX_ROLLUP_DAYS,
  rollupRange as defaultRollupRange,
  aggregateDayFromRaw as defaultAggregateDayFromRaw,
} from './daily-rollup-manager.js';

const n = (value) => Number(value) || 0;

const getStatRepo = () => getRepository(DailyStat);
const getCampaignRepo = () => getRepository(Campaign);
const getVendorRepo = () => getRepository(Vendor);

export const STAT_GROUP_BY_SAFE = (groupBy) => {
  const allowed = ['date', 'campaign', 'vendor', 'campaign_vendor'];
  return allowed.includes(groupBy) ? groupBy : 'date';
};

export const resolveUserScope = async (userId) => {
  const [campaigns, vendors] = await Promise.all([
    getCampaignRepo().find({
      where: { userId },
      select: ['id', 'name', 'verificationMode', 'flowConfig'],
    }),
    getVendorRepo().find({
      where: { userId },
      select: ['id', 'name', 'code'],
    }),
  ]);
  return {
    campaigns,
    vendors,
    campaignIds: campaigns.map((c) => c.id),
    vendorIds: vendors.map((v) => v.id),
  };
};

export const getReport = async (
  userId,
  query = {},
  {
    rollupRangeFn = defaultRollupRange,
    aggregateDayFromRawFn = defaultAggregateDayFromRaw,
  } = {},
) => {
  const timezone = normalizeTimezone(query.timezone || DEFAULT_TIMEZONE);
  const today = todayYmd(timezone);
  let from = String(query.from || query.date || today).slice(0, 10);
  let to = String(query.to || from).slice(0, 10);
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  const days = eachYmd(from, to);
  const rangeClamped = days.length > MAX_ROLLUP_DAYS;
  const usedDays = days.slice(0, MAX_ROLLUP_DAYS);
  to = usedDays[usedDays.length - 1] || from;

  const groupBy = String(query.groupBy || 'date');
  const includesToday = from <= today && to >= today;
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const statsFrom = from;
  const statsTo = includesToday ? (from < today ? yesterday : null) : to;
  if (statsTo && statsFrom <= statsTo) {
    await rollupRangeFn(statsFrom, statsTo, timezone);
  }

  const empty = (source) => ({
    from,
    to,
    timezone,
    groupBy,
    rangeClamped,
    source,
    todayLive: includesToday,
    totals: emptyMetrics(),
    rows: [],
  });

  const { campaignIds, vendorIds, campaigns, vendors } =
    await resolveUserScope(userId);
  if (!campaignIds.length && !vendorIds.length) {
    return empty(includesToday ? 'raw_today' : 'daily_stats');
  }

  const campaignId = parseInt(query.campaignId, 10);
  const vendorId = parseInt(query.vendorId, 10);
  if (
    Number.isFinite(campaignId) &&
    campaignId > 0 &&
    !campaignIds.includes(campaignId)
  ) {
    return empty(includesToday ? 'raw_today' : 'daily_stats');
  }
  if (
    Number.isFinite(vendorId) &&
    vendorId > 0 &&
    !vendorIds.includes(vendorId)
  ) {
    return empty(includesToday ? 'raw_today' : 'daily_stats');
  }

  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
  const nameRow = (row, date = row.statDate) => {
    const cid = n(row.campaignId);
    const vid = n(row.vendorId);
    return {
      ...emptyMetrics(),
      ...row,
      statDate: date,
      timezone,
      campaignId: cid,
      vendorId: vid,
      operatorStatus: parseOperatorStatusMap(
        row.operatorStatus || row.operatorStatusJson,
      ),
      campaignName:
        campaignMap[cid]?.name || (cid ? `Campaign #${cid}` : 'Unattributed'),
      vendorName:
        vendorMap[vid]?.name || (vid ? `Vendor #${vid}` : 'Unattributed'),
      vendorCode: vendorMap[vid]?.code || null,
    };
  };
  const inScope = (row) => {
    const cid = n(row.campaignId);
    const vid = n(row.vendorId);
    if (Number.isFinite(campaignId) && campaignId > 0 && cid !== campaignId)
      return false;
    if (
      !(Number.isFinite(campaignId) && campaignId > 0) &&
      campaignIds.length &&
      cid !== 0 &&
      !campaignIds.includes(cid)
    ) {
      return false;
    }
    if (Number.isFinite(vendorId) && vendorId > 0 && vid !== vendorId)
      return false;
    if (
      !(Number.isFinite(vendorId) && vendorId > 0) &&
      vendorIds.length &&
      vid !== 0 &&
      !vendorIds.includes(vid)
    ) {
      return false;
    }
    return true;
  };

  const named = [];
  if (statsTo && statsFrom <= statsTo) {
    const qb = getStatRepo()
      .createQueryBuilder('s')
      .where('s.statDate BETWEEN :from AND :to', {
        from: statsFrom,
        to: statsTo,
      })
      .andWhere('s.timezone = :timezone', { timezone });
    if (Number.isFinite(campaignId) && campaignId > 0) {
      qb.andWhere('s.campaignId = :campaignId', { campaignId });
    } else if (campaignIds.length) {
      qb.andWhere('(s.campaignId IN (:...campaignIds) OR s.campaignId = 0)', {
        campaignIds,
      });
    }
    if (Number.isFinite(vendorId) && vendorId > 0) {
      qb.andWhere('s.vendorId = :vendorId', { vendorId });
    } else if (vendorIds.length) {
      qb.andWhere('(s.vendorId IN (:...vendorIds) OR s.vendorId = 0)', {
        vendorIds,
      });
    }
    const stored = await qb.orderBy('s.statDate', 'DESC').getMany();
    named.push(...stored.map((row) => nameRow(row)));
  }

  if (includesToday) {
    const live = await aggregateDayFromRawFn(today, timezone);
    for (const row of live.map.values()) {
      if (!inScope(row)) continue;
      named.push(nameRow(row, today));
    }
  }

  const source = includesToday
    ? statsTo && statsFrom <= statsTo
      ? 'daily_stats+raw_today'
      : 'raw_today'
    : 'daily_stats';
  const rows = groupStatsRows(named, groupBy);
  return {
    from,
    to,
    timezone,
    groupBy: STAT_GROUP_BY_SAFE(groupBy),
    rangeClamped,
    source,
    todayLive: includesToday,
    totals: totalsFromRows(named),
    rows,
  };
};
