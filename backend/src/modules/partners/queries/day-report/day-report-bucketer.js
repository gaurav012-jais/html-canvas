import { In } from 'typeorm';
import { ApiCallType } from '../../../../database/entities/api-call-log.entity.js';
import {
  DAY_REPORT_HE_LOG_TYPES,
  DAY_REPORT_HIT_TYPES,
  digitsMsisdn,
  isHeFailCgRedirect,
} from '../../helpers/postback-day-report.js';

export const bucketDayReportRecords = async ({
  deps,
  postbacks,
  logs,
  events,
  scopedCampaignIds,
  scopedVendorIds,
  vendorMap,
}) => {
  const { getPostbackRepo, getVendorRepo, getCampaignRepo } = deps;
  const byMsisdn = new Map();
  const byVisit = new Map();
  const heLogTypes = new Set(DAY_REPORT_HE_LOG_TYPES);
  const seedCallTypes = new Set(
    DAY_REPORT_HIT_TYPES.concat([ApiCallType.HE_REDIRECT]),
  );

  const ensure = (raw) => {
    const msisdn = digitsMsisdn(raw);
    if (!msisdn) return null;
    if (!byMsisdn.has(msisdn)) {
      byMsisdn.set(msisdn, { msisdn, postback: null, logs: [], events: [] });
    }
    return byMsisdn.get(msisdn);
  };

  const ensureVisit = (visitId, fallbackKey) => {
    const key = visitId ? `visit:${visitId}` : fallbackKey;
    if (!key) return null;
    if (!byVisit.has(key)) {
      byVisit.set(key, {
        msisdn: '',
        visitId: visitId || null,
        postback: null,
        logs: [],
        events: [],
      });
    }
    return byVisit.get(key);
  };

  const putInBucket = (msisdn, visitId, clickId, postbackId) => {
    const digits = digitsMsisdn(msisdn);
    if (digits) return ensure(digits);
    return ensureVisit(
      visitId,
      clickId ? `click:${clickId}` : postbackId ? `pb:${postbackId}` : null,
    );
  };

  for (const row of postbacks) {
    const bucket = putInBucket(row.msisdn, row.visitId, row.clickId, row.id);
    if (!bucket) continue;
    if (!bucket.postback || Number(row.id) > Number(bucket.postback.id)) {
      bucket.postback = row;
    }
  }

  for (const log of logs) {
    const msisdn = digitsMsisdn(log.msisdn);
    if (!msisdn) continue;
    if (seedCallTypes.has(log.callType)) {
      const bucket = ensure(msisdn);
      if (bucket) bucket.logs.push(log);
      continue;
    }
    const existing = byMsisdn.get(msisdn);
    if (existing) existing.logs.push(log);
  }

  const visitToMsisdn = new Map();
  const rememberVisit = (bucket) => {
    const fromPb = bucket.postback?.visitId || bucket.visitId;
    if (fromPb) visitToMsisdn.set(Number(fromPb), bucket);
    for (const log of bucket.logs) {
      if (log.visitId) visitToMsisdn.set(Number(log.visitId), bucket);
    }
  };
  for (const bucket of byMsisdn.values()) rememberVisit(bucket);
  for (const bucket of byVisit.values()) rememberVisit(bucket);

  for (const log of logs) {
    if (digitsMsisdn(log.msisdn)) continue;
    if (!isHeFailCgRedirect(log)) continue;
    const vid = log.visitId ? Number(log.visitId) : null;
    if (vid && visitToMsisdn.has(vid)) {
      visitToMsisdn.get(vid).logs.push(log);
      continue;
    }
    const bucket = ensureVisit(vid, log.id ? `log:${log.id}` : null);
    if (bucket) bucket.logs.push(log);
  }

  for (const log of logs) {
    if (digitsMsisdn(log.msisdn)) continue;
    if (!heLogTypes.has(log.callType) || isHeFailCgRedirect(log)) continue;
    const vid = log.visitId ? Number(log.visitId) : null;
    if (!vid) continue;
    if (visitToMsisdn.has(vid)) {
      visitToMsisdn.get(vid).logs.push(log);
      continue;
    }
    const bucket = byVisit.get(`visit:${vid}`);
    if (bucket) bucket.logs.push(log);
  }

  for (const log of logs) {
    if (digitsMsisdn(log.msisdn)) continue;
    if (
      log.callType !== ApiCallType.BILLING_CALLBACK &&
      log.callType !== ApiCallType.VENDOR_POSTBACK
    ) {
      continue;
    }
    const vid = log.visitId ? Number(log.visitId) : null;
    if (vid && visitToMsisdn.has(vid)) {
      visitToMsisdn.get(vid).logs.push(log);
      continue;
    }
    const bucket = ensureVisit(
      vid,
      log.clickId ? `click:${log.clickId}` : log.id ? `log:${log.id}` : null,
    );
    if (bucket) bucket.logs.push(log);
  }

  for (const ev of events) {
    const phone = ev.visit?.phone;
    let bucket = ensure(phone);
    if (!bucket) {
      const vid = ev.visitId || ev.visit?.id;
      if (vid && visitToMsisdn.has(Number(vid))) {
        bucket = visitToMsisdn.get(Number(vid));
      } else if (vid) {
        bucket = ensureVisit(Number(vid));
      }
    }
    if (!bucket) continue;
    bucket.events.push(ev);
  }

  const buckets = [...byMsisdn.values(), ...byVisit.values()];

  const missingMsisdns = [...byMsisdn.values()]
    .filter((b) => !b.postback)
    .map((b) => b.msisdn);
  if (missingMsisdns.length) {
    const extra = await getPostbackRepo().find({
      where: { msisdn: In(missingMsisdns.slice(0, 2000)) },
    });
    for (const row of extra) {
      const bucket = ensure(row.msisdn);
      if (!bucket) continue;
      const inScope =
        (row.campaignId &&
          scopedCampaignIds.includes(Number(row.campaignId))) ||
        (row.vendorId && scopedVendorIds.includes(Number(row.vendorId)));
      if (!inScope) continue;
      if (!bucket.postback || Number(row.id) > Number(bucket.postback.id)) {
        bucket.postback = row;
      }
    }
  }

  const missingVids = [
    ...new Set(
      buckets
        .map((b) => b.postback?.vendorId)
        .filter((id) => id && !vendorMap[id]),
    ),
  ];
  if (missingVids.length) {
    const extraVendors = await getVendorRepo().find({
      where: { id: In(missingVids) },
    });
    for (const v of extraVendors) vendorMap[v.id] = v;
  }

  const campaignIdsNeeded = [
    ...new Set(
      buckets
        .flatMap((b) => [
          b.postback?.campaignId,
          ...b.logs.map((l) => l.campaignId),
        ])
        .filter(Boolean),
    ),
  ];
  const campaignMap = {};
  if (campaignIdsNeeded.length) {
    const campaigns = await getCampaignRepo().find({
      where: { id: In(campaignIdsNeeded) },
      select: ['id', 'name'],
    });
    for (const c of campaigns) campaignMap[c.id] = c;
  }

  return { buckets, campaignMap };
};
