import { In } from 'typeorm';
import {
  DAY_REPORT_HIT_TYPES,
  DAY_REPORT_MAX_NUMBERS,
  buildCallbackHit,
  buildNumberStory,
  formatDayReportText,
  summarizeHits,
  summarizeStories,
} from '../../helpers/postback-day-report.js';
import {
  matchesHitFilters,
  matchesNumberFilters,
  paginateItems,
} from '../../helpers/report-filters.js';

export const composeDayReport = async ({
  deps,
  buckets,
  logs,
  vendorMap,
  campaignMap,
  timezone,
  date,
  endDate,
  rangeClamped,
  filters,
  query,
}) => {
  const { getVisitRepo } = deps;

  let numbers = buckets.map((bucket) => {
    const campaignId =
      bucket.postback?.campaignId ||
      bucket.logs.find((l) => l.campaignId)?.campaignId ||
      null;
    return buildNumberStory({
      msisdn: bucket.msisdn,
      postback: bucket.postback,
      logs: bucket.logs,
      events: bucket.events,
      vendor: bucket.postback?.vendorId
        ? vendorMap[bucket.postback.vendorId]
        : null,
      campaign: campaignId ? campaignMap[campaignId] : null,
    });
  });

  numbers.sort((a, b) => {
    const at = Date.parse(
      a.queuedAt ||
        a.heRedirectedAt ||
        a.billingReceivedAt ||
        a.vendorFiredAt ||
        0,
    );
    const bt = Date.parse(
      b.queuedAt ||
        b.heRedirectedAt ||
        b.billingReceivedAt ||
        b.vendorFiredAt ||
        0,
    );
    return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
  });

  const truncated = numbers.length > DAY_REPORT_MAX_NUMBERS;
  if (truncated) numbers = numbers.slice(0, DAY_REPORT_MAX_NUMBERS);

  let hits = logs
    .filter((l) => DAY_REPORT_HIT_TYPES.includes(l.callType))
    .map((l) => buildCallbackHit(l, timezone));

  const hitVisitIds = [
    ...new Set(hits.map((h) => h.visitId).filter(Boolean)),
  ];
  if (hitVisitIds.length) {
    const visits = await getVisitRepo().find({
      where: { id: In(hitVisitIds) },
      select: ['id', 'vendorId', 'campaignId'],
    });
    const visitMap = Object.fromEntries(visits.map((v) => [v.id, v]));
    hits = hits.map((hit) => {
      const visit = hit.visitId ? visitMap[hit.visitId] : null;
      return {
        ...hit,
        vendorId: hit.vendorId || visit?.vendorId || null,
        campaignId: hit.campaignId || visit?.campaignId || null,
      };
    });
  }

  const filteredNumbers = numbers.filter((row) =>
    matchesNumberFilters(row, filters),
  );
  const filteredHits = hits.filter((hit) => matchesHitFilters(hit, filters));
  const summary = {
    ...summarizeStories(filteredNumbers),
    ...summarizeHits(filteredHits),
  };

  const exportMode =
    filters.writeFile ||
    ['csv', 'txt', 'text'].includes(String(query.format || '').toLowerCase());
  const view = filters.view || 'numbers';
  let pageNumbers = filteredNumbers;
  let pageHits = filteredHits;
  let paging = {
    total: view === 'hits' ? filteredHits.length : filteredNumbers.length,
    page: 1,
    limit: view === 'hits' ? filteredHits.length : filteredNumbers.length,
    totalPages: 1,
  };
  if (!exportMode) {
    if (view === 'hits') {
      paging = paginateItems(filteredHits, filters.page, filters.limit);
      pageHits = paging.items;
      pageNumbers = [];
    } else {
      paging = paginateItems(filteredNumbers, filters.page, filters.limit);
      pageNumbers = paging.items;
      pageHits = [];
    }
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    date,
    timezone,
    from: date,
    to: endDate,
    generatedAt,
    truncated,
    rangeClamped: Boolean(rangeClamped),
    summary,
    numbers: pageNumbers,
    hits: pageHits,
    view,
    total: paging.total,
    page: paging.page,
    limit: paging.limit,
    totalPages: paging.totalPages,
    filters: {
      campaignId: filters.campaignId,
      vendorId: filters.vendorId,
      outcome: filters.outcome,
      hitType: filters.hitType,
      q: filters.q,
      view,
    },
  };
  payload.text = formatDayReportText(
    { ...payload, numbers: filteredNumbers, hits: filteredHits },
    timezone,
  );
  return payload;
};
