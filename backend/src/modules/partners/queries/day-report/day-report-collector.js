import { Visit } from '../../../../database/entities/visit.entity.js';
import {
  DAY_REPORT_EVENT_TYPES,
  DAY_REPORT_HIT_TYPES,
  DAY_REPORT_LOG_TYPES,
  DAY_REPORT_MAX_NUMBERS,
  digitsMsisdn,
} from '../../helpers/postback-day-report.js';

export const collectDayReportData = async ({
  deps,
  scope,
  from,
  to,
  scopedCampaignIds,
  scopedVendorIds,
  filters,
}) => {
  const { getPostbackRepo, getVisitEventRepo, getApiCallLogRepo } = deps;
  const { applyUserScope } = scope;

  const pbQ = getPostbackRepo()
    .createQueryBuilder('p')
    .where(
      '(p.createdAt BETWEEN :from AND :to OR p.updatedAt BETWEEN :from AND :to OR p.sentAt BETWEEN :from AND :to)',
      { from, to },
    );
  applyUserScope(pbQ, 'p', scopedCampaignIds, scopedVendorIds);
  if (filters.q) {
    const like = `%${filters.q}%`;
    pbQ.andWhere(
      '(p.msisdn LIKE :like OR p.clickId LIKE :like OR p.rcid LIKE :like OR p.campid LIKE :like OR p.trackingCampid LIKE :like)',
      { like },
    );
  }
  const postbacks = await pbQ
    .orderBy('p.id', 'DESC')
    .take(DAY_REPORT_MAX_NUMBERS)
    .getMany();

  const seedMsisdns = [
    ...new Set(postbacks.map((p) => digitsMsisdn(p.msisdn)).filter(Boolean)),
  ];
  const seedVisitIds = [
    ...new Set(postbacks.map((p) => p.visitId).filter(Boolean)),
  ];

  const logQ = getApiCallLogRepo()
    .createQueryBuilder('l')
    .where('l.createdAt BETWEEN :from AND :to', { from, to })
    .andWhere('l.callType IN (:...logTypes)', {
      logTypes: DAY_REPORT_LOG_TYPES,
    });
  const unmatchedHits =
    '(l.campaignId IS NULL AND l.callType IN (:...hitTypes))';
  const hitTypes = DAY_REPORT_HIT_TYPES;
  if (filters.vendorId) {
    logQ.leftJoin(Visit, 'lv', 'lv.id = l.visitId');
    logQ.andWhere('lv.vendorId = :vendorFilter', {
      vendorFilter: filters.vendorId,
    });
  }
  if (filters.q) {
    const like = `%${filters.q}%`;
    logQ.andWhere(
      '(l.msisdn LIKE :like OR l.clickId LIKE :like OR l.rcid LIKE :like)',
      { like },
    );
  }
  if (scopedCampaignIds.length) {
    const parts = [`l.campaignId IN (:...campaignIds)`, unmatchedHits];
    if (seedMsisdns.length) parts.push('l.msisdn IN (:...seedMsisdns)');
    if (seedVisitIds.length) parts.push('l.visitId IN (:...seedVisitIds)');
    logQ.andWhere(`(${parts.join(' OR ')})`, {
      campaignIds: scopedCampaignIds,
      hitTypes,
      ...(seedMsisdns.length ? { seedMsisdns } : {}),
      ...(seedVisitIds.length ? { seedVisitIds } : {}),
    });
  } else if (seedMsisdns.length) {
    logQ.andWhere(`(l.msisdn IN (:...seedMsisdns) OR ${unmatchedHits})`, {
      seedMsisdns,
      hitTypes,
    });
  } else {
    logQ.andWhere(unmatchedHits, { hitTypes });
  }
  const logs = await logQ.orderBy('l.id', 'ASC').take(8000).getMany();

  let events = [];
  if (scopedCampaignIds.length) {
    const eventQ = getVisitEventRepo()
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.visit', 'v')
      .where('e.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('e.eventType IN (:...eventTypes)', {
        eventTypes: DAY_REPORT_EVENT_TYPES,
      })
      .andWhere('v.campaignId IN (:...campaignIds)', {
        campaignIds: scopedCampaignIds,
      });
    if (filters.vendorId) {
      eventQ.andWhere('v.vendorId = :vendorFilter', {
        vendorFilter: filters.vendorId,
      });
    }
    events = await eventQ.orderBy('e.id', 'ASC').take(8000).getMany();
  }

  return { postbacks, logs, events };
};
