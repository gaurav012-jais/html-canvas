export const parseHeaders = (headersJson) => {
  if (!headersJson) return {};
  try {
    return JSON.parse(headersJson);
  } catch {
    return {};
  }
};

export const resolveTemplate = (templateStr, variables) => {
  let result = String(templateStr || '');
  for (const [key, val] of Object.entries(variables)) {
    const value = val != null ? String(val) : '';
    result = result.split(`{{${key}}}`).join(value);
    result = result.split(`{{$${key}}}`).join(value);
    result = result.split(`{${key}}}`).join(value);
    result = result.split(`#${key.toUpperCase()}#`).join(value);
    result = result.split(`#${key.toLowerCase()}#`).join(value);
  }
  const androidId =
    variables.txid || variables.clickId || variables.visitId || '';
  if (androidId) {
    result = result.split('#ANDROIDID#').join(androidId);
    result = result.split('#androidid#').join(androidId);
    result = result.split('{{androidId}}').join(androidId);
    result = result.split('{{ANDROIDID}}').join(androidId);
  }
  return result;
};

export const mapSubServiceId = (pack) => {
  const p = (pack || 'daily').toLowerCase();
  if (p === 'weekly') return 'HWeekly';
  if (p === 'monthly') return 'HMonthly';
  return 'HDaily';
};

/** Tick defaults: responseCode === "0" means success. Overridable via config. */
export const getSuccessRule = (config) => ({
  key:
    String(
      config?.successKey || config?.success_key || 'responseCode',
    ).trim() || 'responseCode',
  value: String(config?.successValue ?? config?.success_value ?? '0').trim(),
});

export const getFieldValue = (data, key) => {
  if (!data || !key) return null;
  if (data[key] !== undefined && data[key] !== null) return data[key];
  const snake = key
    .replace(/([A-Z])/g, '_$1')
    .replace(/__/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
  if (snake !== key && data[snake] !== undefined && data[snake] !== null) {
    return data[snake];
  }
  return null;
};

export const getBusinessCode = (data, config) => {
  const { key } = getSuccessRule(config);
  const raw = getFieldValue(data, key);
  if (raw === undefined || raw === null) return null;
  return String(raw);
};

/** Tick / SubOTP business codes (HTTP may still be 200). */
export const PARTNER_RESPONSE_MESSAGES = {
  0: 'Success',
  1001: 'OTP expired or not found. Please request a new code.',
  1002: 'OTP mismatch. Please check the code and try again.',
  400: 'Missing or invalid request parameter.',
  500: 'Partner internal server error. Please try again.',
};

export const isBusinessSuccess = (data, config) => {
  if (!data || typeof data !== 'object') return null;
  const { key, value } = getSuccessRule(config);
  const actual = getFieldValue(data, key);
  if (actual === undefined || actual === null) {
    // AE-style partners: { "response": "SUCCESS" | "FAIL" } when key is responseCode
    if (data.response != null) {
      const r = String(data.response).toUpperCase();
      if (r === 'SUCCESS') return true;
      if (r === 'FAIL' || r === 'FAILED') return false;
    }
    return null;
  }
  return String(actual) === value;
};

export const formatPartnerError = (data, config, fallback) => {
  const code = getBusinessCode(data, config);
  const { key, value } = getSuccessRule(config);
  const mapped = code ? PARTNER_RESPONSE_MESSAGES[code] : null;
  const apiMsg =
    data?.responseMessage || data?.response_message || data?.message;
  if (mapped && code !== value) {
    return mapped;
  }
  if (apiMsg) return apiMsg;
  if (code != null) {
    return `Partner error: ${key}=${code} (success when ${key}=${value})`;
  }
  return fallback;
};

export const withRequestMeta = (result, { requestUrl, requestBody }) => ({
  ...result,
  requestUrl: requestUrl || null,
  requestBody: requestBody || null,
});
