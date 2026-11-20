/**
 * Universe DCB Context & Correlation Management
 */

import { getRepository } from '../../../database/index.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { flowEngineService } from '../flow-engine.service.js';
import { flowService } from '../flow.service.js';

export const localCorrelations = new Map();
export const localConfirmLocks = new Set();

export const httpError = (message, statusCode, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

export const parseConfig = (raw) => {
  if (!raw)
    throw httpError(
      'Universe DCB is not configured',
      503,
      'DCB_NOT_CONFIGURED',
    );
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

export const cleanPhone = (value) => String(value || '').replace(/\D/g, '');

export const stripProviderRequestIds = (value) => {
  if (Array.isArray(value)) return value.map(stripProviderRequestIds);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) => !['requestid', 'request_id'].includes(key.toLowerCase()),
      )
      .map(([key, nested]) => [key, stripProviderRequestIds(nested)]),
  );
};

export const loadDcbContext = async (input, options = {}) => {
  const campaign = await flowService.resolveCampaign(input);
  if (!campaign) {
    throw httpError(
      `No campaign found for ${input.country || ''} / ${input.operator || ''}`,
      404,
      'CAMPAIGN_NOT_FOUND',
    );
  }
  if (!campaign.active) {
    throw httpError('This offer is not available', 403, 'CAMPAIGN_INACTIVE');
  }
  if (
    flowEngineService.normalizeMode(campaign.verificationMode) !==
    'UNIVERSE_DCB'
  ) {
    throw httpError(
      'Campaign is not configured for Universe DCB',
      409,
      'DCB_MODE_REQUIRED',
    );
  }
  const apiConfig = await getRepository(ApiConfig).findOne({
    where: { campaignId: campaign.id },
  });
  const config = parseConfig(apiConfig?.dcbConfigJson);
  let checksubConfig = null;
  if (apiConfig?.checksubConfigJson) {
    try {
      checksubConfig =
        typeof apiConfig.checksubConfigJson === 'string'
          ? JSON.parse(apiConfig.checksubConfigJson)
          : apiConfig.checksubConfigJson;
    } catch {
      checksubConfig = null;
    }
  }
  const msisdn = cleanPhone(input.msisdn || input.phone);
  if (options.requireMsisdn && !msisdn) {
    throw httpError('MSISDN is required', 400, 'MSISDN_REQUIRED');
  }
  const visitId = Number(input.visitId);
  if (options.requireVisit && (!visitId || Number.isNaN(visitId))) {
    throw httpError('Visit ID is required', 400, 'VISIT_REQUIRED');
  }
  let visit = null;
  if (visitId) {
    visit = await getRepository(Visit).findOne({
      where: { id: visitId },
    });
    if (
      !visit ||
      (visit.campaignId &&
        Number(visit.campaignId) !== Number(campaign.id)) ||
      (visit.phone && msisdn && cleanPhone(visit.phone) !== msisdn)
    ) {
      throw httpError(
        'Visit does not match this campaign and MSISDN',
        403,
        'DCB_VISIT_MISMATCH',
      );
    }
  }
  const rawChannel = String(input.transactionChannel || '').trim();
  const transactionChannel =
    rawChannel.toUpperCase() === 'HE'
      ? 'HE'
      : rawChannel.toLowerCase() === 'wifi'
        ? 'Wifi'
        : '';
  return {
    campaign,
    config,
    checksubConfig,
    msisdn,
    visitId: visitId || null,
    visit,
    source: String(input.dcbSource || input.source || '').trim(),
    serviceId: String(
      input.serviceId || config.serviceId || campaign.serviceId || '',
    ).trim(),
    purchaseTypeId: String(input.purchaseTypeId || '').trim(),
    transactionChannel,
  };
};

export const correlationKey = (campaignId, input, msisdn) => {
  return `dcb:pending:${campaignId}:${Number(input.visitId)}:${msisdn}`;
};

export const saveCorrelation = async (
  key,
  providerRequestId,
  purchaseTypeId,
  ttlSeconds,
) => {
  if (!providerRequestId) return;
  const ttl = Math.max(60, Number(ttlSeconds) || 600);
  const value = { providerRequestId, purchaseTypeId };
  localCorrelations.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  await redisService.set(key, value, ttl);
};

export const loadCorrelation = async (key) => {
  const cached = await redisService.get(key);
  if (cached?.providerRequestId) return cached;
  const local = localCorrelations.get(key);
  if (!local) return null;
  if (local.expiresAt <= Date.now()) {
    localCorrelations.delete(key);
    return null;
  }
  return local.value.providerRequestId ? local.value : null;
};

export const clearCorrelation = async (key) => {
  localCorrelations.delete(key);
  await redisService.del(key);
};
