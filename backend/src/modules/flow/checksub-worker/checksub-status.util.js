/**
 * Delayed Checksub Status & Config Utilities
 */

import { getRepository } from '../../../database/index.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { ORANGE_BF_DEFAULTS } from '../orange-bf.provider.js';

export const BATCH_LIMIT = 20;
export const LOCK_TTL_SECONDS = 30;
export const LOG_PREFIX = '[DelayedChecksub]';

export const safeParseJson = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Classify operator checksub status.
 * Per business requirement:
 * Only 'ACTIVE' (or equivalent success indicators) is considered a success.
 * 'GRACE', 'PARKING', 'PENDING', 'SUSPENDED', etc. are recorded as non-success.
 */
export const classifyChecksubStatus = (rawStatus) => {
  const s = String(rawStatus || '').trim().toUpperCase();
  if (
    s === 'ACTIVE' ||
    s === 'ACT' ||
    s === '1' ||
    s === 'SUBSCRIBED' ||
    s === 'SUCCESS' ||
    s === 'ENTITLED' ||
    s === 'TRIAL_ACTIVE'
  ) {
    return {
      statusLabel: 'ACTIVE',
      isSuccess: true,
    };
  }
  if (s.includes('GRACE')) {
    return {
      statusLabel: 'GRACE',
      isSuccess: false,
    };
  }
  if (s.includes('PARK') || s.includes('LOW_BALANCE')) {
    return {
      statusLabel: 'PARKING',
      isSuccess: false,
    };
  }
  if (s.includes('PENDING') || s.includes('WAITING')) {
    return {
      statusLabel: 'PENDING',
      isSuccess: false,
    };
  }
  if (s.includes('SUSPEND')) {
    return {
      statusLabel: 'SUSPENDED',
      isSuccess: false,
    };
  }
  return {
    statusLabel: s || 'FAILED',
    isSuccess: false,
  };
};

export const getDcbEndpointUrl = (baseUrl, path = '/api/dcb/subscriptions') => {
  const base = String(baseUrl || '').trim();
  if (!base) return path;
  try {
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
  } catch {
    return `${base}${path}`;
  }
};

/**
 * Load ApiConfig for a campaign and extract the fields needed for
 * orangeBfProvider.checkSubscription(), mirroring the parseProviderConfig
 * logic in orange-bf.service.js lines 167-238.
 */
export const loadProviderConfig = async (campaignId) => {
  try {
    const apiConfig = await getRepository(ApiConfig).findOne({
      where: { campaignId: parseInt(campaignId, 10) },
    });

    if (!apiConfig) return { ...ORANGE_BF_DEFAULTS };

    const headersParsed = safeParseJson(apiConfig.headersJson);
    const otpConfigParsed = safeParseJson(apiConfig.otpConfigJson);
    const merged = { ...headersParsed, ...otpConfigParsed };

    let baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
    if (merged.baseUrl) {
      baseUrl = merged.baseUrl;
    } else if (apiConfig.sendUrl) {
      try {
        baseUrl = new URL(apiConfig.sendUrl).origin;
      } catch {
        baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
      }
    }

    return {
      baseUrl,
      checksubUrl: merged.checksubUrl || apiConfig.subscriptionApi || null,
      checksubMethod: (merged.checksubMethod || 'GET').toUpperCase(),
      checksubBodyJson: merged.checksubBodyJson || null,
      checksubHeadersJson:
        merged.checksubHeadersJson || merged.headersJson || apiConfig.headersJson || null,
      checksubConfigJson: apiConfig.checksubConfigJson || null,
      serviceId: merged.serviceId || ORANGE_BF_DEFAULTS.serviceId,
      subServiceId: merged.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      cpId: merged.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: merged.channel || ORANGE_BF_DEFAULTS.channel,
      country: merged.country || ORANGE_BF_DEFAULTS.country,
      operator: merged.operator || ORANGE_BF_DEFAULTS.operator,
      timeoutMs: Number(merged.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs,
    };
  } catch (err) {
    console.warn(`${LOG_PREFIX} loadProviderConfig error (campaignId=${campaignId}):`, err.message);
    return { ...ORANGE_BF_DEFAULTS };
  }
};
