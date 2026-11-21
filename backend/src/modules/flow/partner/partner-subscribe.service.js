import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  resolveTemplate,
  buildVars,
  serializeBody,
  parseHeaders,
  logCall,
  sendRequest,
} from './partner-http.js';

export const subscribeStatusLabel = (data, success, fallback) => {
  const nested = data?.data && typeof data.data === 'object' ? data.data : data;
  const current = String(nested?.currentStatus || '').trim();
  if (current) return current.toUpperCase();
  const sub = String(nested?.subscriptionStatus || '').trim();
  if (sub) return sub.toUpperCase();
  const code = nested?.responseCode ?? data?.responseCode;
  if (code === '0' || code === 0) return 'SUCCESS';
  if (typeof nested?.response === 'string' && nested.response) {
    return String(nested.response).toUpperCase();
  }
  if (fallback) return fallback;
  return success ? 'SUCCESS' : 'FAILED';
};

export const subscribeRequestMeta = (input, extra = {}) => {
  const vars = buildVars(input);
  return {
    source: extra.source || 'subscribe',
    method: extra.method || null,
    planId: input.planId || vars.planId || null,
    pack: vars.pack,
    serviceId: vars.serviceId || null,
    subServiceId: vars.subServiceId || null,
    country: vars.country || null,
    operator: vars.operator || null,
    ...(extra.reason ? { skipped: true, reason: extra.reason } : {}),
  };
};

export const resolveSubscribeTemplate = (config, input) => {
  const overrideUrl = String(input.subscribeUrl || '').trim();
  return overrideUrl || String(config?.subscribeApi || '').trim();
};

/**
 * Persist a subscribe-URL row even when we did not HTTP (no phone, already
 * subscribed, missing template). Session Detail still shows the filled URL.
 */
export const recordSubscribeSkip = async (config, input, { reason, statusLabel }) => {
  const template = resolveSubscribeTemplate(config, input);
  const url = template ? resolveTemplate(template, buildVars(input)) : null;
  const meta = subscribeRequestMeta(input, { reason, method: null });
  const failedSkip = reason === 'no_phone' || reason === 'test_fail';
  await logCall({
    callType: ApiCallType.SUBSCRIBE,
    input,
    requestUrl: url,
    requestBody: serializeBody(meta),
    response: {
      status: null,
      data: {
        skipped: true,
        reason,
        statusLabel: statusLabel || String(reason || 'SKIPPED').toUpperCase(),
      },
    },
    success: !failedSkip,
    statusLabel: statusLabel || String(reason || 'SKIPPED').toUpperCase(),
    errorMessage:
      reason === 'no_phone'
        ? 'MSISDN missing — subscribe URL not called'
        : reason === 'test_fail'
          ? 'Test MSISDN fail pattern — subscribe URL not called'
          : null,
  });
  return {
    success: !failedSkip,
    call: {
      url,
      ok: !failedSkip,
      skipped: true,
      reason,
      body: { skipped: true, reason },
    },
  };
};

export const subscribe = async (config, input) => {
  const phone = String(input.phone || '');
  const template = resolveSubscribeTemplate(config, input);
  const resolvedPreview = template
    ? resolveTemplate(template, buildVars(input))
    : '';

  if (phone.startsWith('999') || phone.toLowerCase().includes('fail')) {
    return recordSubscribeSkip(config, input, {
      reason: 'test_fail',
      statusLabel: 'TEST_FAIL',
    });
  }

  if (!template) {
    return recordSubscribeSkip(config, input, {
      reason: 'no_subscribe_api',
      statusLabel: 'SKIPPED_NO_URL',
    });
  }

  if (!phone) {
    return recordSubscribeSkip(config, input, {
      reason: 'no_phone',
      statusLabel: 'NO_PHONE',
    });
  }

  try {
    const headers = parseHeaders(config?.headersJson);
    const { url, response } = await sendRequest(
      template,
      input,
      headers,
      `subscribe visitId=${input.visitId} planId=${input.planId || 'n/a'}`,
    );
    const useGet = url.includes('?');
    const requestBody = serializeBody(
      subscribeRequestMeta(input, { method: useGet ? 'GET' : 'POST' }),
    );
    if (response.status < 200 || response.status >= 300) {
      await logCall({
        callType: ApiCallType.SUBSCRIBE,
        input,
        requestUrl: url,
        requestBody,
        response,
        success: false,
        errorMessage: `HTTP ${response.status}`,
        statusLabel: 'FAILED',
      });
      return {
        success: false,
        call: {
          url,
          ok: false,
          status: response.status,
          body: response.data ?? null,
        },
      };
    }
    const data = response.data ?? {};
    const code = data.responseCode ?? data.response_code;
    let success;
    if (code !== undefined && code !== null) {
      success = code === '0' || code === 0;
    } else if (typeof data.success === 'boolean') {
      success = data.success;
    } else if (data.response != null) {
      success = String(data.response).toUpperCase() === 'SUCCESS';
    } else {
      success = true;
    }
    await logCall({
      callType: ApiCallType.SUBSCRIBE,
      input,
      requestUrl: url,
      requestBody,
      response,
      success,
      statusLabel: subscribeStatusLabel(data, success),
    });
    return {
      success,
      call: {
        url,
        ok: success,
        status: response.status,
        body: data,
      },
    };
  } catch (err) {
    console.warn(`subscribe failed: ${err.message}`);
    await logCall({
      callType: ApiCallType.SUBSCRIBE,
      input,
      requestUrl: err.requestUrl || resolvedPreview || template,
      requestBody:
        err.requestBody ||
        serializeBody(
          subscribeRequestMeta(input, {
            method: (resolvedPreview || template).includes('?')
              ? 'GET'
              : 'POST',
          }),
        ),
      response: err.response,
      success: false,
      errorMessage:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message,
      statusLabel: 'FAILED',
    });
    return {
      success: false,
      call: {
        url: err.requestUrl || resolvedPreview || template,
        ok: false,
        error:
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message,
      },
    };
  }
};
