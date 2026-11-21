import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { VisitEvent } from '../../../database/entities/visit-event.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { searchService } from '../../search/search.service.js';

export const localCorrelations = new Map();
export const localConfirmLocks = new Set();

export const pickDcbExposeRequestId = (input = {}) =>
  String(input?.requestId || input?.request_id || input?.id || '').trim();

export const httpError = (message, statusCode, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

export const cleanPhone = (value) => String(value || '').replace(/\D/g, '');

export const parseConfig = (raw) => {
  if (!raw) {
    throw httpError(
      'Universe DCB is not configured. Set it in Campaign API → Universe DCB.',
      503,
      'DCB_NOT_CONFIGURED',
    );
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    if (parsed.enabled === false) {
      throw httpError('Universe DCB is disabled', 503, 'DCB_NOT_CONFIGURED');
    }
    return parsed;
  } catch (err) {
    if (err.code === 'DCB_NOT_CONFIGURED') throw err;
    throw httpError(
      'Universe DCB configuration is invalid',
      503,
      'DCB_CONFIG_INVALID',
    );
  }
};

const getCampaignRepo = () => getRepository(Campaign);
const getTrackingRepo = () => getRepository(CampaignTracking);
const getVendorRepo = () => getRepository(Vendor);
const getVisitRepo = () => getRepository(Visit);
const getVisitEventRepo = () => getRepository(VisitEvent);

export const logVisitEvent = async (visitId, eventType, metadata) => {
  if (!visitId) return;
  try {
    await getVisitEventRepo().insert(
      getVisitEventRepo().create({
        visitId: Number(visitId),
        eventType,
        metadata,
      }),
    );
    void searchService.indexEvent({
      visitId: Number(visitId),
      campaignId: metadata?.campaignId || null,
      vendorId: metadata?.vendorId || null,
      phone: metadata?.msisdn || null,
      phoneMasked: metadata?.msisdn || null,
      eventType,
      status: metadata?.held
        ? 'HELD'
        : metadata?.success === false
          ? 'FAILED'
          : metadata?.success
            ? 'SUCCESS'
            : null,
      success: metadata?.success,
      errorMessage: metadata?.error || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`DCB expose event log failed: ${err.message}`);
  }
};

export const resolveAssignedVendor = async (campaign, vendorRaw) => {
  const ref = String(vendorRaw || '').trim();
  if (!ref) {
    throw httpError(
      `vendorId is required. Use POST /api/flow/dcb/${campaign.id}/{vendorId}/pincode and /confirm`,
      400,
      'VENDOR_REQUIRED',
    );
  }
  let vendor = null;
  if (/^\d+$/.test(ref)) {
    vendor = await getVendorRepo().findOne({ where: { id: Number(ref) } });
  }
  if (!vendor) {
    vendor = await getVendorRepo().findOne({
      where: { code: ref, userId: campaign.userId },
    });
  }
  if (!vendor) throw httpError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (vendor.active === false) {
    throw httpError('Vendor is deactivated', 400, 'VENDOR_INACTIVE');
  }
  const tracking = await getTrackingRepo().findOne({
    where: { campaignId: campaign.id, vendorId: vendor.id },
  });
  if (!tracking || tracking.active === false) {
    throw httpError(
      'This vendor is not assigned to the campaign',
      400,
      'VENDOR_NOT_ASSIGNED',
    );
  }
  return { vendor, tracking };
};

export const correlationKey = (campaignId, visitId, msisdn) => {
  const vId =
    typeof visitId === 'object' && visitId !== null
      ? Number(visitId.visitId ?? visitId.id) || 0
      : Number(visitId) || 0;
  return `dcb:pending:${campaignId}:${vId}:${msisdn}`;
};

export const requestCorrelationKey = (campaignId, vendorId, requestId) =>
  `dcb:req:${campaignId}:${vendorId}:${String(requestId)}`;

export const saveCorrelation = async (keys, value, ttlSeconds) => {
  if (!value?.providerRequestId) return;
  const ttl = Math.max(60, Number(ttlSeconds) || 600);
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  const wrapped = { value, expiresAt: Date.now() + ttl * 1000 };
  for (const key of list) {
    localCorrelations.set(key, wrapped);
    await redisService.set(key, value, ttl);
  }
};

export const loadCorrelation = async (key) => {
  if (!key) return null;
  const cached = await redisService.get(key);
  if (cached?.providerRequestId) return cached;
  const local = localCorrelations.get(key);
  if (!local) return null;
  if (local.expiresAt <= Date.now()) {
    localCorrelations.delete(key);
    return null;
  }
  return local.value?.providerRequestId ? local.value : null;
};

export const clearCorrelation = async (keys) => {
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  for (const key of list) {
    localCorrelations.delete(key);
    await redisService.del(key);
  }
};

export const acquireConfirmLock = async (lockKey) => {
  if (!lockKey) return false;
  if (localConfirmLocks.has(lockKey)) {
    return false;
  }
  // Synchronously reserve local lock to prevent race condition across concurrent calls in same tick
  localConfirmLocks.add(lockKey);
  try {
    const lockAcquired = await redisService.setNx(lockKey, '1', 30);
    if (!lockAcquired) {
      localConfirmLocks.delete(lockKey);
      return false;
    }
    return true;
  } catch (err) {
    localConfirmLocks.delete(lockKey);
    throw err;
  }
};

export const releaseConfirmLock = async (lockKey) => {
  if (!lockKey) return;
  try {
    await redisService.del(lockKey);
  } finally {
    localConfirmLocks.delete(lockKey);
  }
};

export const loadVisitFromRequestId = async (input = {}) => {
  if (!input) return null;
  const requestId = pickDcbExposeRequestId(input);
  const cId = parseInt(input.campaignId, 10);
  if (!requestId || !cId) return null;
  try {
    const campaign = await getCampaignRepo().findOne({ where: { id: cId } });
    if (!campaign) return null;
    const { vendor } = await resolveAssignedVendor(campaign, input.vendorId);
    const correlation = await loadCorrelation(
      requestCorrelationKey(campaign.id, vendor.id, requestId),
    );
    if (!correlation?.visitId) return null;
    return getVisitRepo().findOne({ where: { id: Number(correlation.visitId) } });
  } catch {
    return null;
  }
};

export const loadLatestVisitForMsisdn = async (input = {}) => {
  if (!input) return null;
  const cId = parseInt(input.campaignId, 10);
  const phone = cleanPhone(input.msisdn);
  const vid = Number(input.vendorId) || null;
  if (!cId || !phone) return null;
  const where = { campaignId: cId, phone };
  if (vid) where.vendorId = vid;
  return getVisitRepo().findOne({
    where,
    order: { id: 'DESC' },
  });
};
