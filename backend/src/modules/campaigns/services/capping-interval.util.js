import { DEFAULT_TIMEZONE, zonedDayBound } from '../../../common/zoned-day.js';

const pad = (n) => String(n).padStart(2, '0');

/** Get YYYY, MM, DD, and weekday for current instant in target timezone (IST Asia/Kolkata) */
export const getZonedDateParts = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: bag.year,
    month: pad(bag.month),
    day: pad(bag.day),
    ymd: `${bag.year}-${pad(bag.month)}-${pad(bag.day)}`,
    weekday: bag.weekday,
  };
};

/**
 * For a given YYYY-MM-DD in IST, find the Monday of that week in IST.
 */
export const getMondayYmd = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  dt.setUTCDate(dt.getUTCDate() - diffToMonday);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/**
 * Returns { redisKey, periodStart, ttl } for a campaign and interval in IST.
 * - daily: resets every day at 00:00 IST
 * - weekly: resets every Monday at 00:00 IST
 * - monthly: resets on 1st of every month at 00:00 IST
 * - total: lifetime / no automatic reset
 */
export const getPeriodMetadata = (
  campaignId,
  interval = 'daily',
  now = new Date(),
  metric = 'clicks',
) => {
  const normInterval = String(interval || 'daily').toLowerCase();
  const normMetric =
    String(metric || 'clicks').toLowerCase() === 'conversions'
      ? 'conv'
      : 'count';
  const { year, month, ymd } = getZonedDateParts(now, DEFAULT_TIMEZONE);

  if (normInterval === 'total' || normInterval === 'lifetime') {
    return {
      redisKey: `capping:${normMetric}:${campaignId}:total`,
      periodStart: null,
      ttl: 86400 * 365,
    };
  }

  if (normInterval === 'weekly') {
    const mondayYmd = getMondayYmd(ymd);
    return {
      redisKey: `capping:${normMetric}:${campaignId}:weekly:${mondayYmd}`,
      periodStart: zonedDayBound(mondayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 14,
    };
  }

  if (normInterval === 'monthly') {
    const firstDayYmd = `${year}-${month}-01`;
    return {
      redisKey: `capping:${normMetric}:${campaignId}:monthly:${year}-${month}`,
      periodStart: zonedDayBound(firstDayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 60,
    };
  }

  // Default: daily
  return {
    redisKey: `capping:${normMetric}:${campaignId}:daily:${ymd}`,
    periodStart: zonedDayBound(ymd, DEFAULT_TIMEZONE, 'start'),
    ttl: 86400 * 2,
  };
};

/**
 * Returns { redisKey, periodStart, ttl } for vendor capping on a campaign and interval in IST.
 * - daily: resets every day at 00:00 IST
 * - weekly: resets every Monday at 00:00 IST
 * - monthly: resets on 1st of every month at 00:00 IST
 * - total: lifetime / no automatic reset
 */
export const getVendorPeriodMetadata = (
  campaignId,
  vendorId,
  interval = 'daily',
  now = new Date(),
  metric = 'clicks',
) => {
  const normInterval = String(interval || 'daily').toLowerCase();
  const normMetric =
    String(metric || 'clicks').toLowerCase() === 'conversions'
      ? 'conv'
      : 'count';
  const { year, month, ymd } = getZonedDateParts(now, DEFAULT_TIMEZONE);
  const vId = Number(vendorId) || 0;

  if (normInterval === 'total' || normInterval === 'lifetime') {
    return {
      redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:total`,
      periodStart: null,
      ttl: 86400 * 365,
    };
  }

  if (normInterval === 'weekly') {
    const mondayYmd = getMondayYmd(ymd);
    return {
      redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:weekly:${mondayYmd}`,
      periodStart: zonedDayBound(mondayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 14,
    };
  }

  if (normInterval === 'monthly') {
    const firstDayYmd = `${year}-${month}-01`;
    return {
      redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:monthly:${year}-${month}`,
      periodStart: zonedDayBound(firstDayYmd, DEFAULT_TIMEZONE, 'start'),
      ttl: 86400 * 60,
    };
  }

  // Default: daily
  return {
    redisKey: `capping:vendor:${normMetric}:${campaignId}:${vId}:daily:${ymd}`,
    periodStart: zonedDayBound(ymd, DEFAULT_TIMEZONE, 'start'),
    ttl: 86400 * 2,
  };
};
