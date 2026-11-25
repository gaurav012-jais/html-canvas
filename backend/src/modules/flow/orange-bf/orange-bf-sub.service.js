import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { orangeBfProvider } from '../orange-bf.provider.js';
import {
  cleanPhone,
  getApiConfig,
  parseProviderConfig,
} from './orange-bf-helpers.js';

export const checkSub = async ({
  phone,
  campaignId,
  visitId,
  vendorId,
} = {}) => {
  const msisdn = cleanPhone(phone);
  let resolvedVendorId = vendorId ? parseInt(vendorId, 10) : null;
  if (!resolvedVendorId && visitId) {
    try {
      const v = await getRepository(Visit).findOne({
        where: { id: parseInt(visitId, 10) },
        select: ['id', 'vendorId'],
      });
      if (v?.vendorId) resolvedVendorId = v.vendorId;
    } catch {
      /* best-effort visit lookup */
    }
  }

  const apiConfig = await getApiConfig(campaignId);
  const config = parseProviderConfig(apiConfig);
  const context = {
    campaignId: campaignId ? String(campaignId) : '',
    visitId: visitId ? String(visitId) : '',
    vendorId: resolvedVendorId ? String(resolvedVendorId) : '',
  };

  const checkResult = await orangeBfProvider.checkSubscription({
    msisdn,
    serviceId: config.serviceId,
    subServiceId: config.subServiceId,
    cpId: config.cpId,
    channel: config.channel,
    country: config.country,
    operator: config.operator,
    context,
    config,
  });

  await apiCallLogService.record({
    visitId: visitId ? parseInt(visitId, 10) : null,
    campaignId: campaignId ? parseInt(campaignId, 10) : null,
    vendorId: resolvedVendorId,
    msisdn,
    callType: ApiCallType.ORANGE_BF_CHECKSUB || 'orange_bf_checksub',
    requestUrl: checkResult.requestUrl,
    requestBody: checkResult.requestBody
      ? typeof checkResult.requestBody === 'string'
        ? checkResult.requestBody
        : JSON.stringify(checkResult.requestBody)
      : JSON.stringify(
          checkResult.requestParams || {
            msisdn,
            serviceId: config.serviceId,
          },
        ),
    responseStatus: checkResult.httpStatus,
    responseBody: checkResult.rawResponse,
    success: checkResult.success,
    errorMessage: checkResult.success ? null : checkResult.responseMessage,
    statusLabel: checkResult.outcome,
  });

  return checkResult;
};

export const unsubscribe = async ({
  phone,
  campaignId,
  visitId,
  vendorId,
} = {}) => {
  const msisdn = cleanPhone(phone);
  let resolvedVendorId = vendorId ? parseInt(vendorId, 10) : null;
  if (!resolvedVendorId && visitId) {
    try {
      const v = await getRepository(Visit).findOne({
        where: { id: parseInt(visitId, 10) },
        select: ['id', 'vendorId'],
      });
      if (v?.vendorId) resolvedVendorId = v.vendorId;
    } catch {
      /* best-effort visit lookup */
    }
  }

  const apiConfig = await getApiConfig(campaignId);
  const config = parseProviderConfig(apiConfig);
  const context = {
    campaignId: campaignId ? String(campaignId) : '',
    visitId: visitId ? String(visitId) : '',
    vendorId: resolvedVendorId ? String(resolvedVendorId) : '',
  };

  const unsubResult = await orangeBfProvider.unsubscribe({
    msisdn,
    serviceId: config.serviceId,
    context,
    config,
  });

  await apiCallLogService.record({
    visitId: visitId ? parseInt(visitId, 10) : null,
    campaignId: campaignId ? parseInt(campaignId, 10) : null,
    vendorId: resolvedVendorId,
    msisdn,
    callType: ApiCallType.ORANGE_BF_UNSUB || 'orange_bf_unsub',
    requestUrl: unsubResult.requestUrl,
    requestBody: unsubResult.requestBody
      ? typeof unsubResult.requestBody === 'string'
        ? unsubResult.requestBody
        : JSON.stringify(unsubResult.requestBody)
      : JSON.stringify(
          unsubResult.requestParams || {
            msisdn,
            serviceId: config.serviceId,
          },
        ),
    responseStatus: unsubResult.httpStatus,
    responseBody: unsubResult.rawResponse,
    success: unsubResult.success,
    errorMessage: unsubResult.success ? null : unsubResult.responseMessage,
    statusLabel: unsubResult.outcome,
  });

  return unsubResult;
};
