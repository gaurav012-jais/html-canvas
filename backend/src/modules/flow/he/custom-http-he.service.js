import axios from 'axios';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { normalizePhone, logCall } from './he-helpers.js';

export const resolveCustomHttp = async (apiConfig, heConfig, input = {}) => {
  const url =
    heConfig?.url || heConfig?.resolveUrl || apiConfig?.resolveMsisdnUrl;
  if (!url) {
    return {
      phone: '',
      error: 'custom_http HE requires url / resolveMsisdnUrl',
    };
  }

  const method = String(heConfig?.method || 'GET').toUpperCase();
  const requestPayload = {
    country: input.country,
    operator: input.operator,
    hint: input.hint,
  };

  try {
    const response =
      method === 'POST'
        ? await axios.post(url, requestPayload, { timeout: 10000 })
        : await axios.get(url, {
            timeout: 10000,
            params: {
              country: input.country,
              operator: input.operator,
              msisdn: input.hint || undefined,
            },
          });

    const data = response.data ?? {};
    const nested = data.data ?? data;
    const phone = normalizePhone(
      nested.msisdn || nested.phone || data.msisdn || data.phone || '',
    );
    const failMessage = heConfig?.failMessage || 'MSISDN not found';

    await logCall({
      callType: ApiCallType.HE_RESOLVE,
      input: { ...input, phone: phone || input.phone },
      requestUrl: url,
      requestBody: {
        method,
        ...(method === 'POST'
          ? { body: requestPayload }
          : { params: requestPayload }),
      },
      response,
      success: Boolean(phone),
      errorMessage: phone ? null : failMessage,
    });

    return phone ? { phone, error: null } : { phone: '', error: failMessage };
  } catch (err) {
    await logCall({
      callType: ApiCallType.HE_RESOLVE,
      input,
      requestUrl: url,
      requestBody: {
        method,
        ...(method === 'POST'
          ? { body: requestPayload }
          : { params: requestPayload }),
      },
      response: err.response,
      success: false,
      errorMessage: err.message,
    });
    throw err;
  }
};
