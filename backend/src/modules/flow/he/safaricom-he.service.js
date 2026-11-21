import axios from 'axios';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  normalizePhone,
  makeSessionId,
  mergeHeaders,
  makeMessageId,
  safeHeadersForLog,
  logCall,
  buildSafaricomClientConfig,
  extractMaskedPhone,
  recordClientSafaricomLogs,
} from './he-helpers.js';

export {
  buildSafaricomClientConfig,
  extractMaskedPhone,
  recordClientSafaricomLogs,
};

export const resolveSafaricomFromBrowser = async (heConfig, input = {}) => {
  const clientConfig = buildSafaricomClientConfig(heConfig);
  if (!clientConfig.tokenUrl || !clientConfig.maskedUrl) {
    return {
      phone: '',
      error: 'Safaricom HE requires tokenUrl + maskedUrl in heConfigJson',
    };
  }

  await recordClientSafaricomLogs(input, input.heClientLogs || {});

  const fromHint = normalizePhone(input.phone || input.hint || '');
  let fromLog = '';
  const msisdnBody = input.heClientLogs?.msisdn?.responseBody;
  if (msisdnBody && typeof msisdnBody === 'object') {
    fromLog = normalizePhone(extractMaskedPhone(msisdnBody));
  }
  const normalized = fromHint || fromLog;
  const failMessage =
    input.heClientError ||
    heConfig.failMessage ||
    'Please use Safaricom Mobile Data';

  if (!normalized) {
    return {
      phone: '',
      error: failMessage,
      sessionId: input.sessionId || null,
      source: 'browser',
    };
  }
  return {
    phone: normalized,
    error: null,
    sessionId: input.sessionId || null,
    source: 'browser',
  };
};

export const fetchSafaricomToken = async (heConfig, input = {}) => {
  const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl;
  if (!tokenUrl) {
    return { token: null, error: 'Safaricom HE requires tokenUrl' };
  }

  const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
  const tokenMethod = String(heConfig.tokenMethod || 'POST').toUpperCase();
  const tokenHeaders = mergeHeaders(
    {
      'X-Session-ID': sessionId,
      'Content-Type': 'application/json',
    },
    heConfig.tokenHeaders,
  );
  const tokenBody = heConfig.tokenBody || {};

  let tokenRes;
  try {
    tokenRes =
      tokenMethod === 'GET'
        ? await axios.get(tokenUrl, { timeout: 12000, headers: tokenHeaders })
        : await axios.post(tokenUrl, tokenBody, {
            timeout: 12000,
            headers: tokenHeaders,
          });
  } catch (err) {
    await logCall({
      callType: ApiCallType.HE_TOKEN,
      input,
      requestUrl: tokenUrl,
      requestBody: {
        method: tokenMethod,
        headers: safeHeadersForLog(tokenHeaders),
        body: tokenBody,
        source: 'server',
      },
      response: err.response,
      success: false,
      errorMessage: err.message,
    });
    return { token: null, sessionId, error: err.message };
  }

  const token =
    tokenRes.data?.access_token ||
    tokenRes.data?.token ||
    tokenRes.data?.data?.access_token ||
    tokenRes.data?.data?.token ||
    (typeof tokenRes.data === 'string' ? tokenRes.data : null);

  await logCall({
    callType: ApiCallType.HE_TOKEN,
    input,
    requestUrl: tokenUrl,
    requestBody: {
      method: tokenMethod,
      headers: safeHeadersForLog(tokenHeaders),
      body: tokenBody,
      source: 'server',
    },
    response: tokenRes,
    success: Boolean(token),
    errorMessage: token ? null : 'HE token missing from tokenUrl response',
  });

  if (!token) {
    return {
      token: null,
      sessionId,
      error: 'HE token missing from tokenUrl response',
    };
  }
  return { token, sessionId, error: null };
};

export const resolveSafaricomMasked = async (heConfig, input = {}) => {
  const tokenUrl = heConfig.tokenUrl || heConfig.heTokenUrl;
  const maskedUrl = heConfig.maskedUrl || heConfig.maskedMsisdnUrl;
  if (!tokenUrl || !maskedUrl) {
    return {
      phone: '',
      error: 'Safaricom HE requires tokenUrl + maskedUrl in heConfigJson',
    };
  }

  const heSource = String(input.heSource || '')
    .toLowerCase()
    .trim();

  // Client finished browser MSISDN step — accept phone + optional logs.
  if (heSource === 'browser') {
    return resolveSafaricomFromBrowser(heConfig, input);
  }

  // Default hybrid bootstrap: server token → hand accessToken to browser for MSISDN.
  if (heSource !== 'server') {
    const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
    const tokenResult = await fetchSafaricomToken(heConfig, {
      ...input,
      sessionId,
    });
    if (!tokenResult.token) {
      return {
        phone: '',
        error:
          tokenResult.error ||
          heConfig.failMessage ||
          'HE token missing from tokenUrl response',
        sessionId: tokenResult.sessionId || sessionId,
      };
    }
    return {
      phone: '',
      error: null,
      needsClientHe: true,
      clientConfig: {
        ...buildSafaricomClientConfig(heConfig),
        accessToken: tokenResult.token,
        skipBrowserToken: true,
      },
      sessionId: tokenResult.sessionId || sessionId,
    };
  }

  const sessionId = makeSessionId(input.sessionId || heConfig.sessionId);
  const tokenResult = await fetchSafaricomToken(heConfig, {
    ...input,
    sessionId,
  });
  if (!tokenResult.token) {
    return {
      phone: '',
      error: tokenResult.error || 'HE token missing from tokenUrl response',
      sessionId: tokenResult.sessionId || sessionId,
    };
  }
  const token = tokenResult.token;

  const maskedHeaders = mergeHeaders(
    {
      Authorization: `Bearer ${token}`,
      'X-App': heConfig.xApp || 'he-partner',
      'X-MessageID': makeMessageId(heConfig),
      'X-Source-System': heConfig.xSourceSystem || 'he-partner',
    },
    heConfig.maskedHeaders,
  );

  let maskedRes;
  try {
    maskedRes = await axios.get(maskedUrl, {
      timeout: 12000,
      headers: maskedHeaders,
    });
  } catch (err) {
    await logCall({
      callType: ApiCallType.HE_MSISDN,
      input,
      requestUrl: maskedUrl,
      requestBody: {
        method: 'GET',
        headers: safeHeadersForLog(maskedHeaders),
        source: 'server',
      },
      response: err.response,
      success: false,
      errorMessage: err.message,
    });
    throw err;
  }

  const body = maskedRes.data || {};
  const phone = extractMaskedPhone(body);

  const failMessage =
    body?.header?.customerMessage ||
    heConfig.failMessage ||
    'Please use Safaricom Mobile Data';

  const normalized = normalizePhone(phone);
  await logCall({
    callType: ApiCallType.HE_MSISDN,
    input: { ...input, phone: normalized || input.phone },
    requestUrl: maskedUrl,
    requestBody: {
      method: 'GET',
      headers: safeHeadersForLog(maskedHeaders),
      source: 'server',
    },
    response: maskedRes,
    success: Boolean(normalized),
    errorMessage: normalized ? null : failMessage,
  });

  if (!normalized) {
    return { phone: '', error: failMessage, sessionId };
  }
  return { phone: normalized, error: null, sessionId };
};
