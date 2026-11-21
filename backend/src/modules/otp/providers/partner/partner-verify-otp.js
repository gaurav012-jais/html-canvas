import axios from 'axios';
import {
  parseHeaders,
  resolveTemplate,
  getSuccessRule,
  getBusinessCode,
  isBusinessSuccess,
  formatPartnerError,
  withRequestMeta,
} from './partner-rules.js';

export const partnerVerifyOtp = async (phone, otp, providerRequestId, config, context = {}) => {
  const verifyUrl = config?.verifyUrl || config?.verify_url;
  const method = (
    config?.verifyMethod ||
    config?.verify_method ||
    'GET'
  ).toUpperCase();
  const headers = parseHeaders(
    config?.headersJson || config?.headers_json || config?.headers,
  );
  const bodyTemplate =
    config?.verifyBodyJson ||
    config?.verify_body_json ||
    config?.verifyBody ||
    '';
  const successRule = getSuccessRule(config);

  if (!verifyUrl) {
    const errorMsg = 'Partner Verify OTP URL missing (verifyUrl)';
    console.error(errorMsg);
    return withRequestMeta(
      { success: false, error: errorMsg, successRule },
      { requestUrl: null, requestBody: null, otp },
    );
  }

  const templateVariables = {
    phone,
    msisdn: phone,
    otp,
    code: otp,
    pin: otp,
    providerRequestId,
    referenceId: providerRequestId,
    transactionId: providerRequestId,
    ip: context?.ip || '',
    ua: context?.ua || '',
    txid:
      context?.txid ||
      context?.clickId ||
      providerRequestId ||
      (context?.visitId ? String(context.visitId) : ''),
    clickId: context?.clickId || '',
    click_id: context?.clickId || '',
    visitId: context?.visitId ? String(context.visitId) : '',
    campaignId: context?.campaignId != null ? String(context.campaignId) : '',
    ...(context?.extraVariables || {}),
  };

  const resolvedUrl = resolveTemplate(verifyUrl, templateVariables);
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

    if (codeSuccess === true) {
      return withRequestMeta(
        {
          success: true,
          responseCode: businessCode,
          successRule,
          rawResponse: data,
          httpStatus: response.status,
          message:
            data?.responseMessage ||
            data?.response_message ||
            `OTP verify OK (${successRule.key}=${successRule.value})`,
        },
        meta,
      );
    }

    if (codeSuccess === false) {
      const msg = formatPartnerError(data, config, 'OTP verification failed');
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
  } catch (error) {
    const data = error.response?.data;
    const errorMsg = formatPartnerError(
      data,
      config,
      data?.message || error.message || 'OTP verification failed',
    );
    console.error(`Partner verification failed with error: ${errorMsg}`);
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
