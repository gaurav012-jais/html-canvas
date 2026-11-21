import axios from 'axios';
import { redisService } from '../../../../common/services/redis.service.js';
import { reserveOtpSend } from '../../helpers/send-limit.js';
import {
  parseHeaders,
  resolveTemplate,
  mapSubServiceId,
  getSuccessRule,
  getBusinessCode,
  isBusinessSuccess,
  formatPartnerError,
  withRequestMeta,
} from './partner-rules.js';

export const partnerSendOtp = async (phone, otp, config, context) => {
  const sendUrl = config?.sendUrl || config?.send_url || config?.url;
  const method = (config?.method || 'GET').toUpperCase();
  const headers = parseHeaders(
    config?.headersJson || config?.headers_json || config?.headers,
  );
  const bodyTemplate =
    config?.bodyJson || config?.body_json || config?.body || '';
  const successRule = getSuccessRule(config);

  if (!sendUrl) {
    const errorMsg = 'Partner Send OTP URL missing (sendUrl)';
    console.error(errorMsg);
    return withRequestMeta(
      { success: false, error: errorMsg, successRule },
      { requestUrl: null, requestBody: null, otp },
    );
  }

  const pack = (context?.pack || 'daily').toLowerCase();
  const templateVariables = {
    phone,
    msisdn: phone,
    otp: otp || '',
    pin: otp || '',
    pack,
    subServiceId: mapSubServiceId(pack),
    campaign: context?.campaignName || '',
    campaignId: context?.campaignId != null ? String(context.campaignId) : '',
    visitId: context?.visitId ? String(context.visitId) : '',
    clickId: context?.clickId || '',
    click_id: context?.clickId || '',
    ip: context?.ip || '',
    ua: context?.ua || '',
    txid:
      context?.txid ||
      context?.clickId ||
      (context?.visitId ? String(context.visitId) : ''),
    ...(context?.extraVariables || {}),
  };

  const resolvedUrl = resolveTemplate(sendUrl, templateVariables);
  const rawBodyStr =
    typeof bodyTemplate === 'object' && bodyTemplate !== null
      ? JSON.stringify(bodyTemplate)
      : String(bodyTemplate || '');
  const resolvedBodyStr = resolveTemplate(rawBodyStr, templateVariables);
  const meta = {
    requestUrl: resolvedUrl,
    requestBody: resolvedBodyStr || null,
    otp,
  };

  await reserveOtpSend(redisService.getClient(), phone, config);

  try {
    let response;
    if (method === 'GET') {
      response = await axios.get(resolvedUrl, { headers, timeout: 10000 });
    } else {
      const bodyObj = resolvedBodyStr ? JSON.parse(resolvedBodyStr) : {};
      response = await axios({
        method,
        url: resolvedUrl,
        data: bodyObj,
        headers,
        timeout: 10000,
      });
    }

    const data = response.data;
    const codeSuccess = isBusinessSuccess(data, config);
    const businessCode = getBusinessCode(data, config);

    if (codeSuccess === false) {
      const msg = formatPartnerError(data, config, 'OTP send failed');
      console.warn(`Partner send rejected: ${msg}`);
      return withRequestMeta(
        {
          success: false,
          error: msg,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
        },
        meta,
      );
    }

    if (codeSuccess === null) {
      // Configured success key missing from body — do not treat bare HTTP 200 as OTP success
      return withRequestMeta(
        {
          success: false,
          error: `Partner response missing "${successRule.key}". Expected ${successRule.key}=${successRule.value} for success.`,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
        },
        meta,
      );
    }

    const providerRequestId = String(
      data?.transactionId ??
        data?.transaction_id ??
        data?.referenceId ??
        data?.reference_id ??
        data?.requestId ??
        data?.request_id ??
        data?.txnId ??
        data?.txn_id ??
        data?.otpId ??
        data?.otp_id ??
        data?.id ??
        'partner-txn-id',
    );

    return withRequestMeta(
      {
        success: true,
        providerRequestId,
        responseCode: businessCode,
        successRule,
        rawResponse: data,
        httpStatus: response.status,
        message:
          data?.responseMessage ||
          data?.response_message ||
          `OTP send OK (${successRule.key}=${successRule.value})`,
      },
      meta,
    );
  } catch (error) {
    const data = error.response?.data;
    const errorMsg = formatPartnerError(
      data,
      config,
      data?.message || error.message || 'OTP send failed',
    );
    console.error(`Partner send failed: ${errorMsg}`);
    return withRequestMeta(
      {
        success: false,
        error: errorMsg,
        responseCode: getBusinessCode(data, config),
        successRule,
        rawResponse: data || null,
        httpStatus: error.response?.status,
      },
      meta,
    );
  }
};
