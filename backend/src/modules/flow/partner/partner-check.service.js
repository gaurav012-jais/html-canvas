import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { interpretChecksubResponse } from '../routing/checksub-rules.js';
import {
  parseHeaders,
  resolveTemplate,
  buildVars,
  partnerRequestBody,
  logCall,
  sendRequest,
} from './partner-http.js';

export const resolveMsisdn = async (config, input) => {
  if (!config?.resolveMsisdnUrl) {
    return null;
  }
  const payload = {
    phone: input.hint,
    country: input.country,
    operator: input.operator,
    visitId: input.visitId,
    campaignId: input.campaignId,
    clickId: input.clickId,
    rcid: input.rcid,
  };
  try {
    const headers = parseHeaders(config.headersJson);
    const { url, requestBody, response } = await sendRequest(
      config.resolveMsisdnUrl,
      payload,
      headers,
      'resolveMsisdn',
    );
    const data = response.data ?? {};
    const nested = data.data ?? data;
    const candidate =
      nested.msisdn ??
      nested.phone ??
      data.msisdn ??
      data.phone ??
      '';
    const resolved = String(candidate || '').trim();
    await logCall({
      callType: ApiCallType.RESOLVE_MSISDN,
      input: payload,
      requestUrl: url,
      requestBody,
      response,
      success: Boolean(resolved),
    });
    return resolved || null;
  } catch (err) {
    console.warn(`resolveMsisdn failed: ${err.message}`);
    await logCall({
      callType: ApiCallType.RESOLVE_MSISDN,
      input: payload,
      requestUrl: err.requestUrl || config.resolveMsisdnUrl,
      requestBody: err.requestBody || payload,
      response: err.response,
      success: false,
      errorMessage:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message,
    });
    return null;
  }
};

export const parseCachedChecksubBody = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/**
 * Partner checksub result.
 * - isActive: currentStatus/subscriptionStatus === active (content access)
 * - shouldSkipSubscribe: not a brand-new user — do not send to CONFIRM/CG
 *   (active | parking | grace | pending | …). Only `new` continues funnel.
 * - go/page/url: set when campaign checksubConfigJson rules match (optional)
 *
 * One partner HTTP per visit + MSISDN. HE detect or OTP-verify runs it;
 * subscribe / confirm / page guards reuse that result (no second Session Detail row).
 */
export const checkSubscription = async (config, input) => {
  const empty = {
    currentStatus: null,
    subscriptionStatus: null,
    status: 'unknown',
    isActive: false,
    shouldSkipSubscribe: false,
    go: null,
    page: null,
    url: null,
  };

  if (!config?.subscriptionApi || !input.phone) {
    return empty;
  }

  if (input.visitId && !input.skipCache && !input.bypassCache) {
    const cached = await apiCallLogService
      .findLatestSuccessfulChecksub(input.visitId, input.phone)
      .catch(() => null);
    const cachedBody = parseCachedChecksubBody(cached?.responseBody);
    if (cachedBody != null) {
      return interpretChecksubResponse(
        cachedBody,
        config.checksubConfigJson,
      );
    }
  }

  try {
    const headers = parseHeaders(config.headersJson);
    const { url, requestBody, response } = await sendRequest(
      config.subscriptionApi,
      input,
      headers,
      'checkSubscription',
      { method: 'GET' },
    );
    const rawData = response.data ?? {};
    const result = interpretChecksubResponse(
      rawData,
      config.checksubConfigJson,
    );
    await logCall({
      callType: ApiCallType.CHECKSUB,
      input,
      requestUrl: url,
      requestBody,
      response,
      success: true,
      statusLabel: (result.status || 'UNKNOWN').toUpperCase(),
    });
    return result;
  } catch (err) {
    console.warn(`checkSubscription failed: ${err.message}`);
    await logCall({
      callType: ApiCallType.CHECKSUB,
      input,
      requestUrl:
        err.requestUrl ||
        resolveTemplate(config.subscriptionApi, buildVars(input)),
      requestBody: err.requestBody || partnerRequestBody(input),
      response: err.response,
      success: false,
      errorMessage:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message,
      statusLabel: 'FAILED',
    });
    return { ...empty, status: 'failed' };
  }
};

export const checkBlocked = async (config, input) => {
  if (!config?.blocklistApi || !input.phone) {
    return { blocked: false };
  }

  if (input.phone.startsWith('999')) {
    return { blocked: true, reason: 'Test block pattern' };
  }

  try {
    const headers = parseHeaders(config.headersJson);
    const { url, requestBody, response } = await sendRequest(
      config.blocklistApi,
      input,
      headers,
      'checkBlocked',
    );
    const data = response.data ?? {};
    const nested = data.data ?? data;
    const blocked = Boolean(
      data.blocked ??
        data.isBlocked ??
        data.dnd ??
        nested.blocked ??
        nested.dnd,
    );
    const reason =
      typeof data.reason === 'string'
        ? data.reason
        : typeof nested.reason === 'string'
          ? nested.reason
          : undefined;
    await logCall({
      callType: ApiCallType.BLOCKLIST,
      input,
      requestUrl: url,
      requestBody,
      response,
      success: true,
    });
    return { blocked, reason };
  } catch (err) {
    console.warn(`checkBlocked failed: ${err.message}`);
    await logCall({
      callType: ApiCallType.BLOCKLIST,
      input,
      requestUrl: err.requestUrl || config.blocklistApi,
      requestBody: err.requestBody || partnerRequestBody(input),
      response: err.response,
      success: false,
      errorMessage:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message,
    });
    return { blocked: false };
  }
};
