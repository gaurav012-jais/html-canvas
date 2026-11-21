import { randomUUID } from 'crypto';
import getConfig from '../../../config/configuration.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';

export const parseJson = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

/**
 * TEMP: when safaricom_masked cannot resolve MSISDN, adopt HE_DUMMY_MSISDN so
 * checksub / blocklist / postback / Session Detail run like a real HE hit.
 */
export const applySafaricomDummyFallback = (result) => {
  if (!result || result.needsClientHe) return result;
  if (normalizePhone(result.phone)) return result;
  const dummy = normalizePhone(getConfig().heDummyMsisdn || '');
  if (!dummy) return result;
  console.warn(
    `[HE] safaricom_masked MSISDN failed — using HE_DUMMY_MSISDN=${dummy} (unset env to disable)`,
  );
  return {
    ...result,
    phone: dummy,
    error: null,
    source: 'he_dummy_msisdn',
    heDummyFallback: true,
  };
};

export const pickRedirectUrl = (heConfig, ...keys) => {
  for (const key of keys) {
    const value = String(heConfig?.[key] || '').trim();
    if (value && /^https?:\/\//i.test(value)) return value;
  }
  return '';
};

export const redirectMeta = (heConfig = {}) => ({
  failRedirectUrl: pickRedirectUrl(
    heConfig,
    'failRedirectUrl',
    'heFailRedirectUrl',
  ),
  successRedirectUrl: pickRedirectUrl(
    heConfig,
    'successRedirectUrl',
    'heSuccessRedirectUrl',
  ),
});

export const makeSessionId = (hint) => {
  const fromHint = String(hint || '').trim();
  if (fromHint) return fromHint;
  return `sid_${Date.now()}_${randomUUID().slice(0, 8)}`;
};

export const mergeHeaders = (base, extra) => {
  if (!extra) return { ...base };
  if (typeof extra === 'string') {
    try {
      const parsed = JSON.parse(extra);
      return {
        ...base,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      };
    } catch {
      return { ...base };
    }
  }
  if (typeof extra === 'object' && !Array.isArray(extra)) {
    return { ...base, ...extra };
  }
  return { ...base };
};

export const makeMessageId = (heConfig) => {
  const configured = String(
    heConfig?.messageId || heConfig?.xMessageId || '',
  ).trim();
  if (configured) return configured;
  return '1234';
};

export const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

export const redactSecrets = (data) => data;

export const safeHeadersForLog = (headers = {}) => {
  return { ...headers };
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
      msisdn: input?.phone || input?.hint || null,
      rcid: input?.rcid,
      clickId: input?.clickId,
      callType,
      requestUrl,
      requestBody: serializeBody(requestBody),
      responseStatus: response?.status ?? null,
      responseBody: serializeBody(redactSecrets(response?.data)),
      success,
      errorMessage,
      statusLabel,
    });
  } catch (err) {
    console.warn(`api_call_logs HE write failed: ${err.message}`);
  }
};

export const buildSafaricomClientConfig = (heConfig = {}) => {
  const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl || '';
  const maskedUrl = heConfig.maskedUrl || heConfig.maskedMsisdnUrl || '';
  return {
    tokenUrl,
    maskedUrl,
    tokenMethod: String(heConfig.tokenMethod || 'POST').toUpperCase(),
    tokenBody: heConfig.tokenBody || {},
    xApp: heConfig.xApp || 'he-partner',
    xMessageId: makeMessageId(heConfig),
    xSourceSystem: heConfig.xSourceSystem || 'he-partner',
    failMessage:
      heConfig.failMessage || 'Please use Safaricom Mobile Data',
  };
};

export const extractMaskedPhone = (body = {}) =>
  body?.data?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
  body?.ServiceResponse?.ResponseBody?.Response?.Msisdn ||
  body?.msisdn ||
  body?.MSISDN ||
  body?.data?.msisdn ||
  body?.MaskedMsisdn ||
  body?.maskedMsisdn ||
  '';

export const recordClientSafaricomLogs = async (input = {}, heClientLogs = {}) => {
  const tokenLog = heClientLogs?.token;
  if (tokenLog && typeof tokenLog === 'object') {
    await logCall({
      callType: ApiCallType.HE_TOKEN,
      input,
      requestUrl: tokenLog.requestUrl || null,
      requestBody: tokenLog.requestBody ?? {
        method: tokenLog.method || 'POST',
        headers: safeHeadersForLog(tokenLog.headers || {}),
        body: tokenLog.body ?? {},
        source: 'browser',
      },
      response: {
        status: tokenLog.responseStatus ?? null,
        data: tokenLog.responseBody ?? null,
      },
      success: Boolean(tokenLog.success),
      errorMessage: tokenLog.errorMessage || null,
      statusLabel: tokenLog.success ? 'SUCCESS' : 'FAILED',
    });
  }

  const msisdnLog = heClientLogs?.msisdn;
  if (msisdnLog && typeof msisdnLog === 'object') {
    await logCall({
      callType: ApiCallType.HE_MSISDN,
      input,
      requestUrl: msisdnLog.requestUrl || null,
      requestBody: msisdnLog.requestBody ?? {
        method: msisdnLog.method || 'GET',
        headers: safeHeadersForLog(msisdnLog.headers || {}),
        source: 'browser',
      },
      response: {
        status: msisdnLog.responseStatus ?? null,
        data: msisdnLog.responseBody ?? null,
      },
      success: Boolean(msisdnLog.success),
      errorMessage: msisdnLog.errorMessage || null,
      statusLabel: msisdnLog.success ? 'SUCCESS' : 'FAILED',
    });
  }
};
