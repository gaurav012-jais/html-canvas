import { getRepository } from '../../../database/index.js';
import { DailyStat } from '../../../database/entities/daily-stat.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
} from '../../../common/zoned-day.js';
import { todayYmd } from '../../partners/helpers/postback-day-report.js';
import {
  eachYmd,
  emptyMetrics,
  parseOperatorStatusMap,
} from '../helpers/daily-stats.js';
import { collectDay, n } from './daily-rollup-collector.js';

export const MAX_ROLLUP_DAYS = 93;

const getStatRepo = () => getRepository(DailyStat);

export const persistDay = async (date, tz, map) => {
  const rolledAt = new Date();
  const entities = [...map.values()].map((row) => {
    const { operatorStatus, ...rest } = row;
    return getStatRepo().create({
      ...emptyMetrics(),
      ...rest,
      operatorStatusJson: parseOperatorStatusMap(operatorStatus),
      statDate: date,
      timezone: tz,
      campaignId: n(row.campaignId),
      vendorId: n(row.vendorId),
      rolledAt,
    });
  });

  await getStatRepo()
    .createQueryBuilder()
    .delete()
    .where('statDate = :date', { date })
    .andWhere('timezone = :tz', { tz })
    .execute();

  if (entities.length) {
    await getStatRepo().save(entities);
  }

  return { date, timezone: tz, rows: entities.length };
};

export const dayNeedsOperatorBackfill = async (ymd, timezone) => {
  const row = await getStatRepo()
    .createQueryBuilder('s')
    .select('COUNT(*)', 'cnt')
    .where('s.statDate = :date', { date: ymd })
    .andWhere('s.timezone = :tz', { tz: timezone })
    .andWhere('s.operatorStatusJson IS NULL')
    .getRawOne();
  return n(row?.cnt) > 0;
};

export const lastRolledAt = async (ymd, timezone) => {
  const row = await getStatRepo()
    .createQueryBuilder('s')
    .select('MAX(s.rolledAt)', 'rolledAt')
    .addSelect('COUNT(*)', 'cnt')
    .where('s.statDate = :date', { date: ymd })
    .andWhere('s.timezone = :tz', { tz: timezone })
    .getRawOne();
  return {
    rolledAt: row?.rolledAt ? new Date(row.rolledAt) : null,
    count: n(row?.cnt),
  };
};

export const rollupDay = (ymd, timezone = DEFAULT_TIMEZONE) =>
  collectDay(ymd, timezone, { persist: true, persistDayFn: persistDay });

export const aggregateDayFromRaw = (ymd, timezone = DEFAULT_TIMEZONE) =>
  collectDay(ymd, timezone, { persist: false });

export const ensureDay = async (
  ymd,
  timezone = DEFAULT_TIMEZONE,
  { force = false } = {},
) => {
  const tz = normalizeTimezone(timezone);
  const today = todayYmd(tz);
  if (ymd === today && !force) {
    return { date: ymd, skipped: true, rows: 0, reason: 'today_is_raw' };
  }
  const { count } = await lastRolledAt(ymd, tz);
  const needsOperator =
    count > 0 ? await dayNeedsOperatorBackfill(ymd, tz) : false;
  if (!force && !needsOperator && count > 0) {
    return { date: ymd, skipped: true, rows: count };
  }
  return rollupDay(ymd, tz);
};

export const rollupRange = async (
  fromYmd,
  toYmd,
  timezone = DEFAULT_TIMEZONE,
  opts = {},
) => {
  const tz = normalizeTimezone(timezone);
  const today = todayYmd(tz);
  const days = eachYmd(fromYmd, toYmd)
    .slice(0, MAX_ROLLUP_DAYS)
    .filter((day) => opts.force || day < today);
  const rolled = [];
  for (const day of days) {
    rolled.push(await ensureDay(day, timezone, opts));
  }
  return rolled;
};

export const rollupRecent = async (timezone = DEFAULT_TIMEZONE) => {
  const tz = normalizeTimezone(timezone);
  const today = todayYmd(tz);
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  return [await rollupDay(yesterday, tz)];
};
