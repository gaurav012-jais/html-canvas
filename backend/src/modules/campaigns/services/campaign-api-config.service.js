import { getRepository } from '../../../database/index.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { flowEngineService } from '../../flow/flow-engine.service.js';
import { invalidateFlowCampaignCache } from './campaign-cache.service.js';

export const createCampaignApiConfigService = ({ findOne }) => {
  const getApiConfigRepo = () => getRepository(ApiConfig);

  const getApiConfig = async (campaignId, userId) => {
    const campaign = await findOne(campaignId, userId);
    let config = await getApiConfigRepo().findOne({
      where: { campaignId: parseInt(campaignId, 10) },
    });
    const mode = flowEngineService.normalizeMode(campaign?.verificationMode);
    if (!config && mode === 'ORANGE_BF') {
      const orangeDefault = {
        baseUrl: 'http://103.153.58.55',
        serviceId: 'Health Portal Livliness',
        subServiceId: 'Health Portal Livliness pass jour',
        cpId: '100',
        channel: 'ussd',
        country: 'BF',
        operator: 'ORG',
        language: '_E',
        successKey: 'responseCode',
        successValue: '0',
      };
      return {
        campaignId: parseInt(campaignId, 10),
        subscriptionApi:
          'http://103.153.58.55/subapi/checksub?msisdn={{msisdn}}&serviceId=Health Portal Livliness',
        subscribeApi: null,
        blocklistApi: null,
        headersJson: JSON.stringify(orangeDefault),
        otpConfigJson: JSON.stringify({
          sendUrl:
            'http://103.153.58.55/subapi/auth/otp/generate?msisdn={{msisdn}}&language=_E',
          verifyUrl:
            'http://103.153.58.55/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}',
          method: 'GET',
          verifyMethod: 'GET',
          successKey: 'responseCode',
          successValue: '0',
          payoutPercent: 100,
        }),
      };
    }
    return config;
  };

  const upsertApiConfig = async (campaignId, payload, userId) => {
    await findOne(campaignId, userId);

    const allowed = {
      blocklistApi: payload.blocklistApi,
      subscriptionApi: payload.subscriptionApi,
      subscribeApi: payload.subscribeApi,
      headersJson: payload.headersJson,
      otpConfigJson: payload.otpConfigJson,
      resolveMsisdnUrl: payload.resolveMsisdnUrl,
      heProvider: payload.heProvider,
      heConfigJson: payload.heConfigJson,
      checksubConfigJson: payload.checksubConfigJson,
      dcbConfigJson: payload.dcbConfigJson,
    };
    // Strip undefined so we don't wipe fields the client omitted
    Object.keys(allowed).forEach((k) => {
      if (allowed[k] === undefined) delete allowed[k];
    });
    // Empty string → null (clear subscribe URL)
    if (Object.prototype.hasOwnProperty.call(allowed, 'subscribeApi')) {
      const raw = allowed.subscribeApi;
      allowed.subscribeApi =
        raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }
    if (Object.prototype.hasOwnProperty.call(allowed, 'checksubConfigJson')) {
      const raw = allowed.checksubConfigJson;
      allowed.checksubConfigJson =
        raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }
    if (Object.prototype.hasOwnProperty.call(allowed, 'dcbConfigJson')) {
      const raw = allowed.dcbConfigJson;
      allowed.dcbConfigJson =
        raw == null || String(raw).trim() === '' ? null : String(raw).trim();
    }

    let config = await getApiConfigRepo().findOne({
      where: { campaignId: parseInt(campaignId, 10) },
    });
    if (!config) {
      config = getApiConfigRepo().create({
        campaignId: parseInt(campaignId, 10),
        ...allowed,
      });
    } else {
      Object.assign(config, allowed);
    }
    const saved = await getApiConfigRepo().save(config);
    await invalidateFlowCampaignCache(campaignId);
    return saved;
  };

  return {
    getApiConfig,
    upsertApiConfig,
  };
};
