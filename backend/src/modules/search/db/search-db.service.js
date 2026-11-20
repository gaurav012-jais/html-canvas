import { getDataSource, getRepository } from '../../../database/index.js';
import { VisitEvent } from '../../../database/entities/visit-event.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { DEFAULT_TIMEZONE } from '../../../common/zoned-day.js';
import { otpConversionStats } from '../../otp/helpers/conversion.js';
import {
  funnelTotalsFromRows,
  parseCompareEvents,
  pivotFunnelTimeSeries,
} from '../helpers/funnel-compare.js';
import { maskPhone } from '../queries/es-query.builder.js';
import { applyDbFilters, applyVisitFilters } from '../queries/db-query.builder.js';

export const resolveInterval = (params) => {
  if (params.interval === 'hour' || params.interval === 'day') {
    return params.interval;
  }
  if (params.from && params.to && params.from === params.to) return 'hour';
  return 'day';
};

export const getUtcOffsetString = (timeZone, at = new Date()) => {
  try {
    for (const name of ['longOffset', 'shortOffset']) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: name,
        hour: '2-digit',
      }).formatToParts(at);
      const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
      if (!tzName) continue;
      if (tzName === 'GMT' || tzName === 'UTC') return '+00:00';
      const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
      if (match) {
        const sign = match[1];
        const hours = String(parseInt(match[2], 10)).padStart(2, '0');
        const mins = (match[3] || '00').padStart(2, '0');
        return `${sign}${hours}:${mins}`;
      }
    }
    const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(at.toLocaleString('en-US', { timeZone }));
    const offsetMin = Math.round((local.getTime() - utc.getTime()) / 60000);
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  } catch {
    return '+00:00';
  }
};

export const jsonBoolSql = (columnJsonPath, jsonKey) => {
  const dbType = getDataSource().options.type;
  if (dbType === 'postgres') {
    return `(${columnJsonPath}->>'${jsonKey}') IN ('true', 't', '1')`;
  }
  if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
    return `json_extract(${columnJsonPath}, '$.${jsonKey}') IN (1, 'true', 't')`;
  }
  return `JSON_EXTRACT(${columnJsonPath}, '$.${jsonKey}') IN (true, 1, 'true')`;
};

export const otpStatsFromDb = async (params) => {
  const successTrue = jsonBoolSql('event.metadata', 'success');
  const heldTrue = jsonBoolSql('event.metadata', 'held');
  const qb = getRepository(VisitEvent)
    .createQueryBuilder('event')
    .leftJoin('event.visit', 'visit')
    .select(
      `COALESCE(SUM(CASE WHEN event.event_type = 'OTP_SEND' AND ${successTrue} THEN 1 ELSE 0 END), 0)`,
      'requested',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.event_type = 'OTP_VERIFY' AND ${successTrue} THEN 1 ELSE 0 END), 0)`,
      'liveVerified',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.event_type = 'OTP_VERIFY' AND ${heldTrue} THEN 1 ELSE 0 END), 0)`,
      'held',
    );
  applyDbFilters(qb, params, { ignoreEventType: true });
  const row = await qb.getRawOne();
  return otpConversionStats({
    requested: row?.requested,
    liveVerified: row?.liveVerified,
    held: row?.held,
  });
};

export const buildEventDateSelect = (interval, timeZone) => {
  const dbType = getDataSource().options.type;
  const offset = getUtcOffsetString(timeZone);
  if (dbType === 'postgres') {
    const fmt = interval === 'hour' ? 'YYYY-MM-DD"T"HH24:00:00' : 'YYYY-MM-DD';
    return `TO_CHAR(timezone('${timeZone.replace(/'/g, "''")}', event.createdAt AT TIME ZONE 'UTC'), '${fmt}')`;
  }
  if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
    const fmt = interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
    return `strftime('${fmt}', event.createdAt)`;
  }
  const fmt = interval === 'hour' ? '%Y-%m-%dT%H:00:00' : '%Y-%m-%d';
  return `DATE_FORMAT(CONVERT_TZ(event.createdAt, '+00:00', '${offset}'), '${fmt}')`;
};

export const funnelCompareFromDb = async (params, interval, timeZone) => {
  const compareEvents = parseCompareEvents(params.compareEvents);
  const dateSelect = buildEventDateSelect(interval, timeZone);
  const qb = getRepository(VisitEvent)
    .createQueryBuilder('event')
    .leftJoin('event.visit', 'visit')
    .select(dateSelect, 'groupkey')
    .addSelect('event.eventType', 'eventType')
    .addSelect('COUNT(event.id)', 'count');
  applyDbFilters(qb, params, { ignoreEventType: true });
  qb.andWhere('event.eventType IN (:...funnelEvents)', {
    funnelEvents: compareEvents,
  })
    .groupBy('groupkey')
    .addGroupBy('event.eventType')
    .orderBy('groupkey', 'ASC');
  const raw = await qb.getRawMany();
  return {
    compareEvents,
    timeSeriesByEvent: pivotFunnelTimeSeries(raw, compareEvents),
    funnelTotals: funnelTotalsFromRows(raw, compareEvents),
  };
};

export const searchSessionsFromDb = async (params) => {
  const page = Math.max(1, params.page || 1);
  const size = Math.min(200, Math.max(1, params.size || 25));

  const queryBuilder = getRepository(Visit).createQueryBuilder('visit');
  applyVisitFilters(queryBuilder, params);

  queryBuilder
    .orderBy('visit.updatedAt', 'DESC')
    .addOrderBy('visit.id', 'DESC')
    .skip((page - 1) * size)
    .take(size);

  const [visits, total] = await queryBuilder.getManyAndCount();
  const ids = visits.map((v) => v.id).filter(Boolean);

  const eventCountByVisit = new Map();
  const lastEventByVisit = new Map();
  if (ids.length > 0) {
    const counts = await getRepository(VisitEvent)
      .createQueryBuilder('e')
      .select('e.visitId', 'visitId')
      .addSelect('COUNT(e.id)', 'cnt')
      .where('e.visitId IN (:...ids)', { ids })
      .groupBy('e.visitId')
      .getRawMany();
    for (const row of counts) {
      eventCountByVisit.set(Number(row.visitId), Number(row.cnt) || 0);
    }

    const dbType = getDataSource().options.type;
    if (dbType === 'postgres') {
      const lasts = await getRepository(VisitEvent)
        .createQueryBuilder('e')
        .distinctOn(['e.visitId'])
        .where('e.visitId IN (:...ids)', { ids })
        .orderBy('e.visitId', 'ASC')
        .addOrderBy('e.createdAt', 'DESC')
        .getMany();
      for (const e of lasts) {
        lastEventByVisit.set(e.visitId, e.eventType);
      }
    } else {
      for (const id of ids) {
        const last = await getRepository(VisitEvent).findOne({
          where: { visitId: id },
          order: { createdAt: 'DESC' },
        });
        if (last) lastEventByVisit.set(id, last.eventType);
      }
    }
  }

  const items = visits.map((visit) => ({
    campaignId: visit.campaignId,
    visitId: visit.id,
    vendorId: visit.vendorId,
    affiliateId: visit.affiliateId,
    clickId: visit.clickId,
    rcid: visit.rcid,
    campid: visit.campid || null,
    trackingCampid: visit.trackingCampid || null,
    vidRaw: visit.vidRaw,
    affRaw: visit.affRaw,
    phoneMasked: maskPhone(visit.phone),
    phone: visit.phone || null,
    country: visit.country,
    operator: visit.operator,
    pageType: visit.pageType,
    eventType: lastEventByVisit.get(visit.id) || null,
    eventCount: eventCountByVisit.get(visit.id) || 0,
    status: visit.visitStatus,
    ip: visit.ipAddress,
    userAgent: visit.userAgent,
    timestamp:
      (visit.updatedAt || visit.createdAt)?.toISOString?.() ||
      visit.updatedAt ||
      visit.createdAt,
    view: 'sessions',
  }));

  return { total, page, size, items, view: 'sessions' };
};

export const searchFromDb = async (params) => {
  if (params.view === 'sessions') {
    return searchSessionsFromDb(params);
  }

  const page = Math.max(1, params.page || 1);
  const size = Math.min(200, Math.max(1, params.size || 25));

  const queryBuilder = getRepository(VisitEvent)
    .createQueryBuilder('event')
    .leftJoinAndSelect('event.visit', 'visit');

  applyDbFilters(queryBuilder, params);

  queryBuilder
    .orderBy('event.createdAt', 'DESC')
    .skip((page - 1) * size)
    .take(size);

  const [events, total] = await queryBuilder.getManyAndCount();

  const items = events.map((event) => ({
    campaignId: event.visit?.campaignId,
    visitId: event.visitId,
    vendorId: event.visit?.vendorId,
    affiliateId: event.visit?.affiliateId,
    clickId: event.visit?.clickId,
    rcid: event.visit?.rcid,
    campid: event.visit?.campid || null,
    trackingCampid: event.visit?.trackingCampid || null,
    vidRaw: event.visit?.vidRaw,
    affRaw: event.visit?.affRaw,
    phoneMasked: maskPhone(event.visit?.phone),
    phone: event.visit?.phone || null,
    country: event.visit?.country,
    operator: event.visit?.operator,
    pageType: event.visit?.pageType,
    eventType: event.eventType,
    status: event.visit?.visitStatus,
    ip: event.visit?.ipAddress,
    userAgent: event.visit?.userAgent,
    timestamp: event.createdAt.toISOString(),
    view: 'events',
  }));

  return { total, page, size, items, view: 'events' };
};

export const aggregationsFromDb = async (
  params,
  interval = 'day',
  timeZone = 'UTC',
) => {
  const buildBaseQuery = (selectKey, alias = 'groupkey') => {
    const qb = getRepository(VisitEvent)
      .createQueryBuilder('event')
      .leftJoin('event.visit', 'visit')
      .select(selectKey, alias)
      .addSelect('COUNT(event.id)', 'count');
    applyDbFilters(qb, params);
    return qb;
  };

  const byEventTypeRaw = await buildBaseQuery('event.eventType')
    .groupBy('event.eventType')
    .orderBy('count', 'DESC')
    .limit(30)
    .getRawMany();

  const byVendorRaw = await buildBaseQuery('visit.vendorId')
    .groupBy('visit.vendorId')
    .orderBy('count', 'DESC')
    .limit(20)
    .getRawMany();

  const byAffiliateRaw = await buildBaseQuery('visit.affiliateId')
    .groupBy('visit.affiliateId')
    .orderBy('count', 'DESC')
    .limit(20)
    .getRawMany();

  const byStatusRaw = await buildBaseQuery('visit.visitStatus')
    .groupBy('visit.visitStatus')
    .orderBy('count', 'DESC')
    .limit(20)
    .getRawMany();

  const dateSelect = buildEventDateSelect(interval, timeZone);

  const timeSeriesRaw = await buildBaseQuery(dateSelect)
    .groupBy('groupkey')
    .orderBy('groupkey', 'ASC')
    .getRawMany();

  const formatBuckets = (rawList) =>
    rawList.map((row) => ({
      key: row.groupkey === null ? 'null' : String(row.groupkey),
      count: Number(row.count),
    }));

  const funnel = await funnelCompareFromDb(params, interval, timeZone);

  return {
    enabled: true,
    interval,
    timeSeries: formatBuckets(timeSeriesRaw),
    byEventType: formatBuckets(byEventTypeRaw),
    byVendor: formatBuckets(byVendorRaw),
    byAffiliate: formatBuckets(byAffiliateRaw),
    byStatus: formatBuckets(byStatusRaw),
    timeSeriesByEvent: funnel.timeSeriesByEvent,
    funnelTotals: funnel.funnelTotals,
    compareEvents: funnel.compareEvents,
    otpStats: await otpStatsFromDb(params),
  };
};
