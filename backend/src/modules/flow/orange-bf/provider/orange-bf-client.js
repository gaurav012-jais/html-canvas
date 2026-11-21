import axios from 'axios';
import { normalizeOrangeBfResponse } from '../../helpers/orange-bf-normalizer.js';

export const ORANGE_BF_DEFAULTS = Object.freeze({
  baseUrl: 'http://103.153.58.55',
  serviceId: 'Health Portal Livliness',
  subServiceId: 'Health Portal Livliness pass jour',
  cpId: '100',
  channel: 'ussd',
  country: 'BF',
  operator: 'ORG',
  language: '_E',
  timeoutMs: 10000,
});

export const parseHeaders = (headersRaw) => {
  if (!headersRaw) return {};
  if (typeof headersRaw === 'object') return headersRaw;
  try {
    return JSON.parse(headersRaw);
  } catch {
    return {};
  }
};

export const tryParseJson = (val) => {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

export const resolveTemplate = (templateStr, variables = {}) => {
  if (!templateStr || typeof templateStr !== 'string') return templateStr;
  let result = templateStr;
  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      result = result.split(`{{${key}}}`).join(String(val));
    }
  }
  return result;
};

export const createOrangeBfHttpClient = ({ httpClient = axios } = {}) => {
  const request = async ({
    method = 'GET',
    url,
    params = {},
    data = null,
    headers = {},
    timeout = 10000,
    config = {},
  }) => {
    const startedAt = Date.now();
    const upperMethod = String(method || 'GET').toUpperCase();
    const resolvedHeaders = parseHeaders(headers);

    const reqOptions = {
      method: upperMethod,
      url,
      timeout,
    };

    if (resolvedHeaders && Object.keys(resolvedHeaders).length > 0) {
      reqOptions.headers = resolvedHeaders;
    }

    if (upperMethod === 'GET' || upperMethod === 'DELETE') {
      if (params && Object.keys(params).length > 0) {
        reqOptions.params = params;
      }
    } else {
      if (data !== undefined && data !== null) {
        reqOptions.data = typeof data === 'string' ? tryParseJson(data) : data;
      }
      if (params && Object.keys(params).length > 0) {
        reqOptions.params = params;
      }
    }

    let fullRequestUrl = url;
    if (reqOptions.params && Object.keys(reqOptions.params).length > 0) {
      try {
        if (typeof httpClient?.getUri === 'function') {
          fullRequestUrl = httpClient.getUri(reqOptions);
        } else {
          const qs = new URLSearchParams(reqOptions.params).toString();
          fullRequestUrl = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
        }
      } catch {
        const qs = new URLSearchParams(reqOptions.params).toString();
        fullRequestUrl = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
      }
    }

    try {
      const response = await httpClient(reqOptions);
      const latencyMs = Date.now() - startedAt;
      const normalized = normalizeOrangeBfResponse(response.data, config);
      return {
        ...normalized,
        httpStatus: response.status,
        rawResponse: response.data,
        latencyMs,
        requestUrl: fullRequestUrl,
        requestParams: reqOptions.params || null,
        requestBody: reqOptions.data || null,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const rawData = error.response?.data;
      const normalized = normalizeOrangeBfResponse(rawData, config);
      return {
        ...normalized,
        success: false,
        httpStatus: error.response?.status || 500,
        error: error.message || 'Network error',
        rawResponse: rawData || null,
        latencyMs,
        requestUrl: fullRequestUrl,
        requestParams: reqOptions.params || null,
        requestBody: reqOptions.data || null,
      };
    }
  };

  return { request };
};
