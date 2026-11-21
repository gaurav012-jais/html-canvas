import {
  ORANGE_BF_DEFAULTS,
  resolveTemplate,
  tryParseJson,
} from './orange-bf-client.js';

export const createOrangeBfSubOps = (request) => ({
  checkSubscription: async ({
    msisdn,
    serviceId,
    subServiceId,
    cpId,
    channel,
    country,
    operator,
    context = {},
    config = {},
  }) => {
    const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
    const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
    const svcId = serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId;
    const method = String(config.checksubMethod || 'GET').toUpperCase();

    const templateVars = {
      msisdn,
      phone: msisdn,
      serviceId: svcId,
      subServiceId: subServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      cpId: cpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: channel || config.channel || ORANGE_BF_DEFAULTS.channel,
      country: country || config.country || ORANGE_BF_DEFAULTS.country,
      operator: operator || config.operator || ORANGE_BF_DEFAULTS.operator,
      campaignId: context.campaignId || '',
      visitId: context.visitId || '',
      ...context,
    };

    const customChecksubUrl = config.checksubUrl || config.subscriptionApi || null;
    let url;
    let params = {};
    let data = null;

    if (customChecksubUrl) {
      url = resolveTemplate(customChecksubUrl, templateVars);
    } else {
      url = `${baseUrl.replace(/\/$/, '')}/subapi/checksub`;
      if (method === 'GET') {
        params = { msisdn, serviceId: svcId };
      }
    }

    if (method !== 'GET') {
      const bodyTemplate = config.checksubBodyJson || null;
      if (bodyTemplate) {
        const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
        const resolvedBody = resolveTemplate(bodyStr, templateVars);
        data = tryParseJson(resolvedBody);
      } else if (!customChecksubUrl) {
        data = { msisdn, serviceId: svcId };
      }
    }

    const headers = config.checksubHeadersJson || config.headersJson || config.headers || {};

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

  unsubscribe: async ({ msisdn, serviceId, context = {}, config = {} }) => {
    const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
    const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
    const svcId = serviceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId;
    const method = String(config.unsubMethod || 'GET').toUpperCase();

    const templateVars = {
      msisdn,
      phone: msisdn,
      serviceId: svcId,
      campaignId: context.campaignId || '',
      visitId: context.visitId || '',
      ...context,
    };

    const customUnsubUrl = config.unsubUrl || null;
    let url;
    let params = {};
    let data = null;

    if (customUnsubUrl) {
      url = resolveTemplate(customUnsubUrl, templateVars);
    } else {
      url = `${baseUrl.replace(/\/$/, '')}/subapi/unsub`;
      if (method === 'GET') {
        params = { msisdn, serviceId: svcId };
      }
    }

    if (method !== 'GET') {
      const bodyTemplate = config.unsubBodyJson || null;
      if (bodyTemplate) {
        const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
        const resolvedBody = resolveTemplate(bodyStr, templateVars);
        data = tryParseJson(resolvedBody);
      } else if (!customUnsubUrl) {
        data = { msisdn, serviceId: svcId };
      }
    }

    const headers = config.unsubHeadersJson || config.headersJson || config.headers || {};

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

  syncSubscription: async ({
    msisdn,
    subServiceId,
    serviceId,
    cpId,
    channel,
    country,
    operator,
    reqType = 1,
    context = {},
    config = {},
  }) => {
    const baseUrl = config.baseUrl || ORANGE_BF_DEFAULTS.baseUrl;
    const timeout = Number(config.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs;
    const method = String(config.syncMethod || 'GET').toUpperCase();

    const templateVars = {
      msisdn,
      phone: msisdn,
      subServiceId: subServiceId || config.syncSubServiceId || config.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      serviceId: serviceId || config.syncServiceId || config.serviceId || ORANGE_BF_DEFAULTS.serviceId,
      cpId: cpId || config.syncCpId || config.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: channel || config.syncChannel || config.channel || ORANGE_BF_DEFAULTS.channel,
      country: country || config.syncCountry || config.country || ORANGE_BF_DEFAULTS.country,
      operator: operator || config.syncOperator || config.operator || ORANGE_BF_DEFAULTS.operator,
      reqType: reqType != null ? reqType : (config.syncReqType != null ? config.syncReqType : 1),
      campaignId: context.campaignId || '',
      visitId: context.visitId || '',
      ...context,
    };

    const customSyncUrl = config.syncUrl || null;
    let url;
    let params = {};
    let data = null;

    if (customSyncUrl) {
      url = resolveTemplate(customSyncUrl, templateVars);
    } else {
      url = `${baseUrl.replace(/\/$/, '')}/Subs_Engine/subscription/sync`;
      if (method === 'GET') {
        params = {
          msisdn,
          subServiceId: templateVars.subServiceId,
          serviceId: templateVars.serviceId,
          cpId: templateVars.cpId,
          channel: templateVars.channel,
          country: templateVars.country,
          operator: templateVars.operator,
          reqType: templateVars.reqType,
        };
      }
    }

    if (method !== 'GET') {
      const bodyTemplate = config.syncBodyJson || null;
      if (bodyTemplate) {
        const bodyStr = typeof bodyTemplate === 'object' ? JSON.stringify(bodyTemplate) : String(bodyTemplate);
        const resolvedBody = resolveTemplate(bodyStr, templateVars);
        data = tryParseJson(resolvedBody);
      } else if (!customSyncUrl) {
        data = {
          msisdn,
          subServiceId: templateVars.subServiceId,
          serviceId: templateVars.serviceId,
          cpId: templateVars.cpId,
          channel: templateVars.channel,
          country: templateVars.country,
          operator: templateVars.operator,
          reqType: templateVars.reqType,
        };
      }
    }

    const headers = config.syncHeadersJson || config.headersJson || config.headers || {};

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
