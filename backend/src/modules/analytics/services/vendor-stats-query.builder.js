import { getDataSource, getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { VisitEvent } from '../../../database/entities/visit-event.entity.js';
import { ConversionPostback, ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';

const getVisitRepo = () => getRepository(Visit);
const getVisitEventRepo = () => getRepository(VisitEvent);
const getPostbackRepo = () => getRepository(ConversionPostback);

export const jsonBoolSql = (columnJsonPath, jsonKey) => {
  let dbType = 'postgres';
  try {
    dbType = getDataSource()?.options?.type || 'postgres';
  } catch {
    dbType = 'postgres';
  }
  if (dbType === 'postgres') {
    return `(${columnJsonPath}->>'${jsonKey}') IN ('true', 't', '1')`;
  }
  if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
    return `json_extract(${columnJsonPath}, '$.${jsonKey}') IN (1, 'true', 't')`;
  }
  return `JSON_EXTRACT(${columnJsonPath}, '$.${jsonKey}') IN (true, 1, 'true')`;
};

export const buildVendorClicksQuery = ({ cId, from, to }) => {
  const clickQB = getVisitRepo()
    .createQueryBuilder('visit')
    .select('visit.vendorId', 'vendorId')
    .addSelect('COUNT(*)', 'clicks')
    .where('visit.campaignId = :cId', { cId });
  if (from) clickQB.andWhere('visit.createdAt >= :since', { since: from });
  if (to) clickQB.andWhere('visit.createdAt <= :until', { until: to });
  return clickQB;
};

export const buildVendorEventsQuery = ({ cId, from, to, successTrue, heldTrue }) => {
  const eventQB = getVisitEventRepo()
    .createQueryBuilder('event')
    .innerJoin('event.visit', 'visit')
    .select('visit.vendorId', 'vendorId')
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_SEND' AND ${successTrue} THEN 1 ELSE 0 END), 0)`,
      'requested',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' AND ${successTrue} THEN 1 ELSE 0 END), 0)`,
      'liveVerified',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' AND ${heldTrue} THEN 1 ELSE 0 END), 0)`,
      'held',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_SEND' AND NOT (${successTrue}) THEN 1 ELSE 0 END), 0)`,
      'failedSend',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' AND NOT (${successTrue}) THEN 1 ELSE 0 END), 0)`,
      'failedVerify',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'SUBSCRIBE_SUCCESS' THEN 1 ELSE 0 END), 0)`,
      'subscribeSuccess',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'HOME_VIEW' THEN 1 ELSE 0 END), 0)`,
      'homeView',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'SUBSCRIBE_CLICK' THEN 1 ELSE 0 END), 0)`,
      'subscribeClick',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'CG_REDIRECT' THEN 1 ELSE 0 END), 0)`,
      'cgRedirect',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_SEND' THEN 1 ELSE 0 END), 0)`,
      'pinRequest',
    )
    .addSelect(
      `COUNT(DISTINCT CASE WHEN event.eventType = 'OTP_SEND' AND ${successTrue} THEN visit.phone END)`,
      'uniquePinSend',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN event.eventType = 'OTP_VERIFY' THEN 1 ELSE 0 END), 0)`,
      'pinValRequest',
    )
    .addSelect(
      `COUNT(DISTINCT CASE WHEN event.eventType = 'OTP_VERIFY' THEN visit.phone END)`,
      'uniquePinValRequest',
    )
    .addSelect(
      `COUNT(DISTINCT CASE WHEN event.eventType = 'OTP_VERIFY' AND ${successTrue} THEN visit.phone END)`,
      'uniquePinVal',
    )
    .where('visit.campaignId = :cId', { cId });
  if (from) eventQB.andWhere('event.createdAt >= :since', { since: from });
  if (to) eventQB.andWhere('event.createdAt <= :until', { until: to });
  return eventQB;
};

export const buildVendorPostbacksQuery = ({ cId, from, to }) => {
  const postbackQB = getPostbackRepo()
    .createQueryBuilder('p')
    .select('p.vendorId', 'vendorId')
    .addSelect(
      `COALESCE(SUM(CASE WHEN p.status IN ('${ConversionPostbackStatus.RECEIVED}', '${ConversionPostbackStatus.SENT}') THEN 1 ELSE 0 END), 0)`,
      'postbacksMatched',
    )
    .addSelect(
      `COALESCE(SUM(CASE WHEN p.status = '${ConversionPostbackStatus.SENT}' THEN 1 ELSE 0 END), 0)`,
      'postbacksSent',
    )
    .where('p.campaignId = :cId', { cId });
  if (from) postbackQB.andWhere('p.createdAt >= :since', { since: from });
  if (to) postbackQB.andWhere('p.createdAt <= :until', { until: to });
  return postbackQB;
};

export const buildVendorFailuresQuery = ({ cId, from, to, successTrue }) => {
  const failedQB = getVisitEventRepo()
    .createQueryBuilder('event')
    .innerJoin('event.visit', 'visit')
    .select('visit.vendorId', 'vendorId')
    .addSelect('event.eventType', 'eventType')
    .addSelect('event.metadata', 'metadata')
    .where('visit.campaignId = :cId', { cId })
    .andWhere(`event.eventType IN ('OTP_VERIFY', 'OTP_SEND')`)
    .andWhere(`NOT (${successTrue})`);
  if (from) failedQB.andWhere('event.createdAt >= :since', { since: from });
  if (to) failedQB.andWhere('event.createdAt <= :until', { until: to });
  return failedQB;
};
