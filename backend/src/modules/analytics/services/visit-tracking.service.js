import { getRepository } from '../../../database/index.js';
import { Visit, VisitStatus } from '../../../database/entities/visit.entity.js';
import { VisitEvent, VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { searchService } from '../../search/search.service.js';
import { cappingService } from '../../campaigns/capping.service.js';
import { filledTrackingValue } from '../../flow/helpers/placeholder-macro.js';

const getVisitRepo = () => getRepository(Visit);
const getVisitEventRepo = () => getRepository(VisitEvent);

export const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

export const indexVisitEvent = async (visitId, eventType, status) => {
  if (!searchService.isEnabled()) return;
  try {
    const visit = await getVisitRepo().findOne({
      where: { id: visitId },
    });
    if (!visit) return;
    await searchService.indexEvent({
      campaignId: visit.campaignId,
      visitId: visit.id,
      vendorId: visit.vendorId,
      affiliateId: visit.affiliateId,
      clickId: visit.clickId,
      rcid: visit.rcid,
      vidRaw: visit.vidRaw,
      affRaw: visit.affRaw,
      phoneMasked: maskPhone(visit.phone),
      phone: visit.phone || null,
      country: visit.country,
      operator: visit.operator,
      pageType: visit.pageType,
      eventType: String(eventType),
      status: status || visit.visitStatus,
      ip: visit.ipAddress,
      userAgent: visit.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // swallow
  }
};

export const logEvent = async (visitId, eventType, metadata) => {
  if (!visitId || Number.isNaN(Number(visitId))) return null;
  const vId = parseInt(visitId, 10);
  const eventPayload = { visitId: vId, eventType, metadata };

  const eventEntity = getVisitEventRepo().create({
    visitId: vId,
    eventType,
    metadata,
  });
  await getVisitEventRepo().insert(eventEntity);

  void indexVisitEvent(vId, eventType);
  return eventPayload;
};

export const createVisit = async (data) => {
  const visit = getVisitRepo().create(data);
  const saved = await getVisitRepo().save(visit);
  await logEvent(saved.id, VisitEventType.VISIT);
  return saved;
};

export const getVisit = async (id) => {
  if (!id || Number.isNaN(Number(id))) return null;
  return await getVisitRepo().findOne({ where: { id: parseInt(id, 10) } });
};

/**
 * Reuse visit created by detect-msisdn when /page races in parallel
 * (same campaign + affiliate rcid, recent window).
 * Window uses DB clock (NOW()) so Node/Postgres skew cannot break dedupe.
 */
export const findRecentVisitByRcid = async (campaignId, rcid, withinMs = 120000) => {
  if (!campaignId || Number.isNaN(Number(campaignId))) return null;
  const cId = parseInt(campaignId, 10);
  const key = filledTrackingValue(rcid);
  if (!cId || !key) return null;

  const withinSec = Math.max(1, Math.ceil(Number(withinMs) / 1000) || 120);

  const visit = await getVisitRepo()
    .createQueryBuilder('v')
    .where('v.campaignId = :cId', { cId })
    .andWhere('v.rcid = :key', { key })
    .andWhere(`v.createdAt > NOW() - (:withinSec * INTERVAL '1 second')`, {
      withinSec,
    })
    .orderBy('v.id', 'ASC')
    .getOne();

  return visit || null;
};

export const updateVisit = async (id, status, pageType, phone) => {
  if (!id || Number.isNaN(Number(id))) return null;
  const visit = await getVisitRepo().findOne({
    where: { id: parseInt(id, 10) },
  });
  if (!visit) return null;

  const prevStatus = visit.visitStatus;
  visit.visitStatus = status;
  if (pageType) {
    visit.pageType = pageType;
  }
  if (phone && phone.trim() !== '') {
    visit.phone = phone.trim();
  }

  const saved = await getVisitRepo().save(visit);

  if (
    status === VisitStatus.SUBSCRIBED &&
    prevStatus !== VisitStatus.SUBSCRIBED &&
    visit.campaignId
  ) {
    cappingService
      .incrementCampaignConversionCount(
        visit.campaignId,
        'daily',
        visit.vendorId,
      )
      .catch(() => {});
  }

  return saved;
};

export const setVisitPhone = async (id, phone) => {
  if (!id || Number.isNaN(Number(id))) return;
  const cleanPhone = phone?.trim();
  if (!cleanPhone) return;
  await getVisitRepo().update({ id: parseInt(id, 10) }, { phone: cleanPhone });
};

/** Fill vendor campid / our tracking_campid when missing on an existing visit. */
export const ensureVisitCampids = async (id, { campid, trackingCampid } = {}) => {
  const visitId = parseInt(id, 10);
  if (!visitId) return;
  const patch = {};
  const vendor = String(campid || '').trim();
  const tracking = String(trackingCampid || '').trim();
  if (!vendor && !tracking) return;

  const visit = await getVisitRepo().findOne({ where: { id: visitId } });
  if (!visit) return;
  if (vendor && !visit.campid) patch.campid = vendor;
  if (tracking && !visit.trackingCampid) patch.trackingCampid = tracking;
  if (Object.keys(patch).length === 0) return;
  await getVisitRepo().update({ id: visitId }, patch);
};

/** Patch attribution fields missing on a visit created by a parallel request. */
export const ensureVisitAttribution = async (
  id,
  { campid, trackingCampid, vidRaw, vendorId } = {},
) => {
  const visitId = parseInt(id, 10);
  if (!visitId) return;
  const visit = await getVisitRepo().findOne({ where: { id: visitId } });
  if (!visit) return;
  const patch = {};
  const vendor = String(campid || '').trim();
  const tracking = String(trackingCampid || '').trim();
  const vid = String(vidRaw || '').trim();
  if (vendor && !visit.campid) patch.campid = vendor;
  if (tracking && !visit.trackingCampid) patch.trackingCampid = tracking;
  if (vid && !visit.vidRaw) patch.vidRaw = vid;
  if (vendorId && !visit.vendorId) patch.vendorId = vendorId;
  if (Object.keys(patch).length === 0) return;
  await getVisitRepo().update({ id: visitId }, patch);
};

/**
 * Drop a duplicate visit created by parallel detect+/page race.
 * Only removes if it has no meaningful events beyond the auto VISIT.
 */
export const abandonOrphanVisit = async (id) => {
  const visitId = parseInt(id, 10);
  if (!visitId) return false;
  const events = await getVisitEventRepo().find({
    where: { visitId },
    take: 5,
  });
  const meaningful = (events || []).filter(
    (e) => e.eventType && e.eventType !== VisitEventType.VISIT,
  );
  if (meaningful.length > 0) return false;
  if (events?.length) {
    await getVisitEventRepo().delete({ visitId });
  }
  await getVisitRepo().delete({ id: visitId });
  return true;
};

export const hasVisitEvent = async (visitId, eventType) => {
  const vId = Number(visitId);
  if (!vId || !eventType) return false;
  const row = await getVisitEventRepo().findOne({
    where: { visitId: vId, eventType },
  });
  return Boolean(row);
};

export const createVisitTrackingService = () => ({
  maskPhone,
  indexVisitEvent,
  createVisit,
  getVisit,
  findRecentVisitByRcid,
  updateVisit,
  setVisitPhone,
  ensureVisitCampids,
  ensureVisitAttribution,
  abandonOrphanVisit,
  hasVisitEvent,
  logEvent,
});

export const visitTrackingService = createVisitTrackingService();
