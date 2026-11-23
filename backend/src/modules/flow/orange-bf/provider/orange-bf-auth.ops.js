import { redisService } from '../../../../common/services/redis.service.js';
import { reserveOtpSend } from '../../../otp/helpers/send-limit.js';
import {
  ORANGE_BF_DEFAULTS,
  resolveTemplate,
  tryParseJson,
} from './orange-bf-client.js';

export const createOrangeBfAuthOps = (request) => ({
  generateAuthOtp: async ({
    msisdn,
    language = '_E',
    serviceId,
    subServiceId,
    cpId,
    channel,
    country,
    operator,
    context = {},
    config = {},
  }) => {
    await reserveOtpSend(redisService.getClient(), msisdn, config);
    const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
    const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
    const method = String(config.sendMethod || config.method || 'GET').toUpperCase();

    const templateVars = {
      msisdn,
      phone: msisdn,
      language: language || config.language || ORANGE_BF_DEFAULTS.language,
      serviceId: serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
      subServiceId: subServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      cpId: cpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: channel || config.channel || ORANGE_BF_DEFAULTS.channel,
      country: country || config.country || ORANGE_BF_DEFAULTS.country,
      operator: operator || config.operator || ORANGE_BF_DEFAULTS.operator,
      campaignId: context.campaignId || '',
      visitId: context.visitId || '',
      ...context,
    };

    const customSendUrl = config.sendUrl || null;
    let url;
    let params = {};
    let data = null;

    if (customSendUrl) {
      url = resolveTemplate(customSendUrl, templateVars);
      if (method === 'GET' && !url.includes('msisdn=')) {
        params = { msisdn, language: templateVars.language };
      }
    } else {
      url = `${baseUrl.replace(/\/$/, '')}/subapi/auth/otp/generate`;
      if (method === 'GET') {
        params = { msisdn, language: templateVars.language };
      }
    }

    if (method !== 'GET') {
      const bodyTemplate = config.sendBodyJson || config.bodyJson || config.body || null;
      if (bodyTemplate) {
        const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
        const resolvedBody = resolveTemplate(bodyStr, templateVars);
        data = tryParseJson(resolvedBody);
      } else if (!customSendUrl) {
        data = { msisdn, language: templateVars.language };
      }
    }

    const headers = config.sendHeadersJson || config.headersJson || config.headers || {};

    return request({
      method,
      url,
      params,
      data,
      headers,
      timeout,
      config,
    });
  },

  validateAuthOtp: async ({
    msisdn,
    otp,
    transactionId = '',
    requestId = '',
    referenceId = '',
    token = '',
    sessionId = '',
    context = {},
    config = {},
  }) => {
    const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
    const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
    const method = String(config.verifyMethod || 'GET').toUpperCase();

    const templateVars = {
      msisdn,
      phone: msisdn,
      otp: String(otp || '').trim(),
      transactionId: transactionId || requestId || referenceId || '',
      transaction_id: transactionId || requestId || referenceId || '',
      requestId: requestId || transactionId || '',
      request_id: requestId || transactionId || '',
      referenceId: referenceId || transactionId || '',
      reference_id: referenceId || transactionId || '',
      token: token || '',
      sessionId: sessionId || '',
      session_id: sessionId || '',
      serviceId: config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
      subServiceId: config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      cpId: config.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: config.channel || ORANGE_BF_DEFAULTS.channel,
      country: config.country || ORANGE_BF_DEFAULTS.country,
      operator: config.operator || ORANGE_BF_DEFAULTS.operator,
      campaignId: context.campaignId || '',
      visitId: context.visitId || '',
      ...context,
    };

    const customVerifyUrl = config.verifyUrl || null;
    let url;
    let params = {};
    let data = null;

    if (customVerifyUrl) {
      url = resolveTemplate(customVerifyUrl, templateVars);
      if (method === 'GET' && !url.includes('msisdn=')) {
        params = { msisdn, otp: templateVars.otp };
      }
    } else {
      url = `${baseUrl.replace(/\/$/, '')}/subapi/auth/otp/validate`;
      if (method === 'GET') {
        params = { msisdn, otp: templateVars.otp };
      }
    }

    if (method !== 'GET') {
      const bodyTemplate = config.verifyBodyJson || config.verifyBody || null;
      if (bodyTemplate) {
        const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
        const resolvedBody = resolveTemplate(bodyStr, templateVars);
        data = tryParseJson(resolvedBody);
      } else if (!customVerifyUrl) {
        data = {
          msisdn,
          otp: templateVars.otp,
          transactionId: templateVars.transactionId || undefined,
        };
      }
    }

    const headers = config.verifyHeadersJson || config.headersJson || config.headers || {};

    return request({
      method,
      url,
      params,
      data,
      headers,
      timeout,
      config,
    });
  },
});
