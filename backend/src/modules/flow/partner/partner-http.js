import axios from 'axios';
import { apiCallLogService } from '../api-call-log.service.js';
import {
  fillSubscribeTemplate,
  mapSubServiceId,
  sanitizeSubscribeParam,
} from '../helpers/pack-url.js';

export const parseHeaders = (headersJson) => {
  if (!headersJson) return {};
  try {
    return JSON.parse(headersJson);
  } catch {
    return {};
  }
};

export const resolveTemplate = (template, vars) =>
  fillSubscribeTemplate(template, vars);

export const buildVars = (input) => {
  const phone = input.phone ?? '';
  const planId = input.planId ?? '';
  return {
    phone,
    msisdn: phone,
    serviceId: sanitizeSubscribeParam(input.serviceId),
    country: input.country ?? '',
    operator: input.operator ?? '',
    planId,
    pack: planId || 'daily',
    subServiceId:
      sanitizeSubscribeParam(input.subServiceId) || mapSubServiceId(planId),
    txid: input.txid || input.clickId || '',
    clickId: input.clickId || input.txid || '',
    ip: input.ip ?? '',
    ua: input.ua ?? '',
  };
};

/** Body sent to partners — strip internal attribution fields. */
export const partnerRequestBody = (input = {}) => {
  const {
    clickId,
    click_id,
    rcid,
    campid,
    trackingCampid,
    tracking_campid,
    visitId,
    campaignId,
    ...rest
  } = input;
  return rest;
};

export const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

export const logCall = async ({
  callType,
  input,
  requestUrl,
  requestBody,
  response,
  success,
  errorMessage,
  statusLabel,
}) => {
  try {
    await apiCallLogService.record({
      visitId: input?.visitId,
      campaignId: input?.campaignId,
      msisdn: input?.phone || input?.msisdn,
      rcid: input?.rcid,
      clickId: input?.clickId,
      callType,
      requestUrl,
      requestBody: serializeBody(
        requestBody !== undefined ? requestBody : partnerRequestBody(input),
      ),
      responseStatus: response?.status ?? null,
      responseBody: serializeBody(response?.data),
      success,
      errorMessage,
      statusLabel,
    });
  } catch (err) {
    console.warn(`api_call_logs write failed: ${err.message}`);
  }
};

export const sendRequest = async (rawUrl, input, headers, _label, options = {}) => {
  const url = resolveTemplate(rawUrl, buildVars(input));
  const method = String(options.method || '').toUpperCase();
  // Checksub is a status lookup — always GET. Otherwise: query string → GET, else POST.
  const useGet =
    method === 'GET' || (method !== 'POST' && url.includes('?'));
  const body = partnerRequestBody(input);
  const actualMethod = useGet ? 'GET' : 'POST';
  const requestPayload = useGet ? body || buildVars(input) : body;
  try {
    const response = useGet
      ? await axios.get(url, { headers, timeout: 5000 })
      : await axios.post(url, body, { headers, timeout: 5000 });
    return {
      url,
      method: actualMethod,
      requestBody: requestPayload,
      response,
    };
  } catch (err) {
    err.requestUrl = url;
    err.requestMethod = actualMethod;
    err.requestBody = requestPayload;
    throw err;
  }
};
