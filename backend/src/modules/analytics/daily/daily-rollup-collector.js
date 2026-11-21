import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ConversionPostback, ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';
import { ApiCallLog, ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  DEFAULT_TIMEZONE,
  normalizeTimezone,
  resolveRangeBounds,
} from '../../../common/zoned-day.js';
import { bumpMetric, bumpOperatorStatus } from '../helpers/daily-stats.js';

export const EVENT_METRIC = {
  [VisitEventType.OTP_SEND]: 'otpSend',
  [VisitEventType.OTP_VERIFY]: 'otpVerify',
  [VisitEventType.SUBSCRIBE_SUCCESS]: 'subscribeSuccess',
  [VisitEventType.SUBSCRIBE_FAILED]: 'subscribeFailed',
};

export function n(value) {
  return Number(value) || 0;
}

const getVisitRepo = () => getRepository(Visit);
const getVisitEventRepo = () => getRepository(VisitEvent);
const getPostbackRepo = () => getRepository(ConversionPostback);
const getApiCallLogRepo = () => getRepository(ApiCallLog);

export const collectDay = async (
  ymd,
  timezone = DEFAULT_TIMEZONE,
  { persist = true, persistDayFn } = {},
) => {
  const date = String(ymd || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { date, rows: 0 };
  }
  const tz = normalizeTimezone(timezone);
  const { from, to } = resolveRangeBounds({
    from: date,
    to: date,
    timezone: tz,
  });
  const map = new Map();

  const visitRows = await getVisitRepo()
    .createQueryBuilder('v')
    .select('v.campaignId', 'campaignId')
    .addSelect('v.vendorId', 'vendorId')
    .addSelect('COUNT(*)', 'visits')
    .addSelect(
      `SUM(CASE WHEN v.phone IS NOT NULL AND v.phone <> '' THEN 1 ELSE 0 END)`,
      'msisdnResolved',
    )
    .where('v.createdAt BETWEEN :from AND :to', { from, to })
    .groupBy('v.campaignId')
    .addGroupBy('v.vendorId')
    .getRawMany();

  for (const row of visitRows) {
    bumpMetric(map, row.campaignId, row.vendorId, 'visits', n(row.visits));
    bumpMetric(
      map,
      row.campaignId,
      row.vendorId,
      'msisdnResolved',
      n(row.msisdnResolved),
    );
  }

  const eventTypes = Object.keys(EVENT_METRIC);
  const eventRows = await getVisitEventRepo()
    .createQueryBuilder('e')
    .innerJoin('e.visit', 'v')
    .select('v.campaignId', 'campaignId')
    .addSelect('v.vendorId', 'vendorId')
    .addSelect('e.eventType', 'eventType')
    .addSelect('COUNT(*)', 'cnt')
    .where('e.createdAt BETWEEN :from AND :to', { from, to })
    .andWhere('e.eventType IN (:...eventTypes)', { eventTypes })
    .groupBy('v.campaignId')
    .addGroupBy('v.vendorId')
    .addGroupBy('e.eventType')
    .getRawMany();

  for (const row of eventRows) {
    const field = EVENT_METRIC[row.eventType];
    if (field) bumpMetric(map, row.campaignId, row.vendorId, field, n(row.cnt));
  }

  const queuedRows = await getPostbackRepo()
    .createQueryBuilder('p')
    .select('p.campaignId', 'campaignId')
    .addSelect('p.vendorId', 'vendorId')
    .addSelect('p.status', 'status')
    .addSelect('COUNT(*)', 'cnt')
    .where('p.createdAt BETWEEN :from AND :to', { from, to })
    .groupBy('p.campaignId')
    .addGroupBy('p.vendorId')
    .addGroupBy('p.status')
    .getRawMany();

  for (const row of queuedRows) {
    bumpMetric(map, row.campaignId, row.vendorId, 'postbacksQueued', n(row.cnt));
    const status = String(row.status || '');
    if (status === ConversionPostbackStatus.PENDING) {
      bumpMetric(map, row.campaignId, row.vendorId, 'pending', n(row.cnt));
    }
  }

  const sentRows = await getPostbackRepo()
    .createQueryBuilder('p')
    .select('p.campaignId', 'campaignId')
    .addSelect('p.vendorId', 'vendorId')
    .addSelect('p.status', 'status')
    .addSelect('COUNT(*)', 'cnt')
    .where('p.sentAt BETWEEN :from AND :to', { from, to })
    .groupBy('p.campaignId')
    .addGroupBy('p.vendorId')
    .addGroupBy('p.status')
    .getRawMany();

  for (const row of sentRows) {
    const status = String(row.status || '');
    if (status === ConversionPostbackStatus.SENT) {
      bumpMetric(map, row.campaignId, row.vendorId, 'vendorSent', n(row.cnt));
    } else if (status === ConversionPostbackStatus.FAILED) {
      bumpMetric(map, row.campaignId, row.vendorId, 'vendorFailed', n(row.cnt));
    } else if (status === ConversionPostbackStatus.SKIPPED) {
      bumpMetric(map, row.campaignId, row.vendorId, 'skipped', n(row.cnt));
    }
  }

  const skipRows = await getPostbackRepo()
    .createQueryBuilder('p')
    .select('p.campaignId', 'campaignId')
    .addSelect('p.vendorId', 'vendorId')
    .addSelect('COUNT(*)', 'cnt')
    .where('p.status = :skipped', { skipped: ConversionPostbackStatus.SKIPPED })
    .andWhere('p.sentAt IS NULL')
    .andWhere('p.updatedAt BETWEEN :from AND :to', { from, to })
    .groupBy('p.campaignId')
    .addGroupBy('p.vendorId')
    .getRawMany();

  for (const row of skipRows) {
    bumpMetric(map, row.campaignId, row.vendorId, 'skipped', n(row.cnt));
  }

  const heRows = await getApiCallLogRepo()
    .createQueryBuilder('l')
    .leftJoin(Visit, 'v', 'v.id = l.visitId')
    .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
    .addSelect('v.vendorId', 'vendorId')
    .addSelect('COUNT(*)', 'cnt')
    .where('l.createdAt BETWEEN :from AND :to', { from, to })
    .andWhere('l.callType = :heRedirect', { heRedirect: ApiCallType.HE_REDIRECT })
    .andWhere('l.success = :fail', { fail: false })
    .groupBy('l.campaignId')
    .addGroupBy('v.campaignId')
    .addGroupBy('v.vendorId')
    .getRawMany();

  for (const row of heRows) {
    bumpMetric(map, row.campaignId, row.vendorId, 'heFailCg', n(row.cnt));
  }

  const unmatchedRows = await getApiCallLogRepo()
    .createQueryBuilder('l')
    .leftJoin(Visit, 'v', 'v.id = l.visitId')
    .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
    .addSelect('v.vendorId', 'vendorId')
    .addSelect('COUNT(*)', 'cnt')
    .where('l.createdAt BETWEEN :from AND :to', { from, to })
    .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
    .andWhere('(l.success = :fail OR l.visitId IS NULL)', { fail: false })
    .groupBy('l.campaignId')
    .addGroupBy('v.campaignId')
    .addGroupBy('v.vendorId')
    .getRawMany();

  for (const row of unmatchedRows) {
    bumpMetric(map, row.campaignId, row.vendorId, 'unmatchedCallbacks', n(row.cnt));
  }

  const billingLogRows = await getApiCallLogRepo()
    .createQueryBuilder('l')
    .leftJoin(Visit, 'v', 'v.id = l.visitId')
    .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
    .addSelect('v.vendorId', 'vendorId')
    .addSelect('COUNT(*)', 'cnt')
    .where('l.createdAt BETWEEN :from AND :to', { from, to })
    .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
    .andWhere('l.success = :ok', { ok: true })
    .andWhere('l.visitId IS NOT NULL')
    .groupBy('l.campaignId')
    .addGroupBy('v.campaignId')
    .addGroupBy('v.vendorId')
    .getRawMany();

  for (const row of billingLogRows) {
    bumpMetric(map, row.campaignId, row.vendorId, 'billingReceived', n(row.cnt));
  }

  try {
    const statusExpr =
      `LOWER(COALESCE(NULLIF((regexp_match(l.request_body, '"status"[[:space:]]*:[[:space:]]*"([^"]+)"'))[1], ''), 'unknown'))`;
    const statusRows = await getApiCallLogRepo()
      .createQueryBuilder('l')
      .leftJoin(Visit, 'v', 'v.id = l.visitId')
      .select('COALESCE(l.campaignId, v.campaignId)', 'campaignId')
      .addSelect('v.vendorId', 'vendorId')
      .addSelect(statusExpr, 'operatorStatus')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('l.callType = :billing', { billing: ApiCallType.BILLING_CALLBACK })
      .groupBy('l.campaignId')
      .addGroupBy('v.campaignId')
      .addGroupBy('v.vendorId')
      .addGroupBy(statusExpr)
      .getRawMany();
    for (const row of statusRows) {
      bumpOperatorStatus(
        map,
        row.campaignId,
        row.vendorId,
        row.operatorStatus || 'unknown',
        n(row.cnt),
      );
    }
  } catch (err) {
    console.warn(`daily_stats operator status rollup (logs): ${err?.message || err}`);
    const fallbackRows = await getPostbackRepo()
      .createQueryBuilder('p')
      .select('p.campaignId', 'campaignId')
      .addSelect('p.vendorId', 'vendorId')
      .addSelect('LOWER(p.operatorStatus)', 'operatorStatus')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.updatedAt BETWEEN :from AND :to', { from, to })
      .andWhere('p.operatorStatus IS NOT NULL')
      .andWhere("p.operatorStatus <> ''")
      .groupBy('p.campaignId')
      .addGroupBy('p.vendorId')
      .addGroupBy('LOWER(p.operatorStatus)')
      .getRawMany();
    for (const row of fallbackRows) {
      bumpOperatorStatus(
        map,
        row.campaignId,
        row.vendorId,
        row.operatorStatus || 'unknown',
        n(row.cnt),
      );
    }
  }

  if (!persist) return { date, timezone: tz, map };
  if (persistDayFn) return persistDayFn(date, tz, map);
  return { date, timezone: tz, map };
};
