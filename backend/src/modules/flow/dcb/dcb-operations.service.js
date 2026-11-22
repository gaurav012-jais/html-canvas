/**
 * Universe DCB State Machine & Flow Operations
 */

import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { universeDcbProvider } from '../universe-dcb.provider.js';
import { apiCallLogService } from '../api-call-log.service.js';
import {
  DCB_OUTCOMES,
  getNestedValue,
  normalizeUniverseDcbResponse,
} from '../helpers/universe-dcb-normalizer.js';
import { mergePurchaseTypeMappings } from '../helpers/universe-dcb-purchase-types.js';
import {
  localConfirmLocks,
  httpError,
  stripProviderRequestIds,
  loadDcbContext,
  correlationKey,
  saveCorrelation,
  loadCorrelation,
  clearCorrelation,
} from './dcb-context.service.js';
import {
  providerInput,
  callProviderWithLogging,
} from './dcb-provider-caller.js';
import { createDcbManualCheckHandler } from './dcb-manual-check.js';

export const createDcbOperations = (
  provider = universeDcbProvider,
  callLogger = apiCallLogService,
) => {
  const normalize = (response, ctx) =>
    normalizeUniverseDcbResponse(response.data, ctx.config, {
      serviceId: ctx.serviceId,
    });

  const callProvider = ({ ctx, callType, action, execute, statusLabel }) =>
    callProviderWithLogging({
      ctx,
      callType,
      action,
      execute,
      statusLabel,
      callLogger,
    });

  const getPublicConfig = async (input) => {
    const ctx = await loadDcbContext(input);
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_CONFIG,
      action: 'config',
      execute: () =>
        provider.getPublicConfig(ctx.config, providerInput(ctx)),
      statusLabel: 'SUCCESS',
    });
    const envelopePath = ctx.config.responsePaths?.envelope;
    const providerConfig = envelopePath
      ? getNestedValue(response.data, envelopePath)
      : response.data;
    const safeProviderConfig = stripProviderRequestIds(providerConfig);
    if (!Array.isArray(safeProviderConfig?.purchaseTypes)) {
      throw httpError(
        'Universe DCB public configuration is malformed',
        502,
        'DCB_PUBLIC_CONFIG_INVALID',
      );
    }
    const purchaseTypeMappings = mergePurchaseTypeMappings(
      ctx.config.purchaseTypeMappings,
      safeProviderConfig.purchaseTypes,
    );
    return {
      ...(safeProviderConfig &&
        typeof safeProviderConfig === 'object' &&
        !Array.isArray(safeProviderConfig)
        ? safeProviderConfig
        : { providerConfig: safeProviderConfig }),
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      merchantId: ctx.config.merchantId,
      operatorCode: ctx.config.operatorCode,
      purchaseTypeMappings,
      pollIntervalMs: ctx.config.pollIntervalMs,
      pollTimeoutMs: ctx.config.pollTimeoutMs,
    };
  };

  const getRuntimeConfig = async (input) => {
    const ctx = await loadDcbContext(input);
    return {
      serviceId: ctx.serviceId,
      pollIntervalMs: Math.max(250, Number(ctx.config.pollIntervalMs) || 2000),
      pollTimeoutMs: Math.max(1000, Number(ctx.config.pollTimeoutMs) || 60000),
      purchaseTypeMappings: Array.isArray(ctx.config.purchaseTypeMappings)
        ? ctx.config.purchaseTypeMappings
        : [],
      skipSinglePackPage: ctx.config.skipSinglePackPage === true,
      checksubConfig: ctx.checksubConfig || null,
    };
  };

  const status = async (input) => {
    const ctx = await loadDcbContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_SUBSCRIPTIONS,
      action: 'subscriptions',
      execute: () =>
        provider.getSubscriptions(ctx.config, providerInput(ctx)),
      statusLabel: (providerResponse) =>
        normalize(providerResponse, ctx).outcome,
    });
    return {
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      ...normalize(response, ctx),
      checksubConfig: ctx.checksubConfig || null,
    };
  };

  const requestPincode = async (input) => {
    const ctx = await loadDcbContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    if (!ctx.purchaseTypeId) {
      throw httpError(
        'Purchase type is required',
        400,
        'PURCHASE_TYPE_REQUIRED',
      );
    }
    if (!ctx.transactionChannel) {
      throw httpError(
        'Transaction channel must be HE or Wifi',
        400,
        'TRANSACTION_CHANNEL_REQUIRED',
      );
    }
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_PINCODE,
      action: 'pincode',
      execute: () =>
        provider.requestPincode(ctx.config, providerInput(ctx)),
      statusLabel: 'PIN_REQUIRED',
    });
    if (!response.providerRequestId) {
      throw httpError(
        'Universe DCB pincode response did not include a request ID',
        502,
        'DCB_PROVIDER_REQUEST_ID_MISSING',
      );
    }
    await saveCorrelation(
      correlationKey(ctx.campaign.id, input, ctx.msisdn),
      response.providerRequestId,
      ctx.purchaseTypeId,
      ctx.config.correlationTtlSeconds,
    );
    return {
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      outcome: DCB_OUTCOMES.PENDING,
      stage: 'PIN_REQUIRED',
      nextPage: 'OTP',
      purchaseTypeId: ctx.purchaseTypeId,
      flowContext: {
        provider: 'UNIVERSE_DCB',
        verificationMode: 'UNIVERSE_DCB',
        stage: 'PIN_REQUIRED',
        outcome: DCB_OUTCOMES.PENDING,
        purchaseTypeId: ctx.purchaseTypeId,
      },
    };
  };

  const { manualCheck, pinSinglePackIfEnabled } = createDcbManualCheckHandler({
    provider,
    callProvider,
    normalize,
    requestPincode,
  });

  const confirm = async (input) => {
    const ctx = await loadDcbContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    const pin = String(input.pin || input.pincode || '').trim();
    if (!pin) throw httpError('PIN is required', 400, 'PIN_REQUIRED');
    const key = correlationKey(ctx.campaign.id, input, ctx.msisdn);
    const correlation = await loadCorrelation(key);
    if (!correlation) {
      throw httpError(
        'PIN request correlation is missing or expired',
        409,
        'DCB_CORRELATION_REQUIRED',
      );
    }
    if (
      ctx.purchaseTypeId &&
      String(correlation.purchaseTypeId) !== ctx.purchaseTypeId
    ) {
      throw httpError(
        'PIN request does not match the selected purchase type',
        409,
        'DCB_CORRELATION_MISMATCH',
      );
    }
    const lockKey = `${key}:confirm`;
    if (localConfirmLocks.has(lockKey)) {
      throw httpError(
        'PIN confirmation is already in progress',
        409,
        'DCB_CONFIRM_IN_PROGRESS',
      );
    }
    const lockAcquired = await redisService.setNx(lockKey, '1', 30);
    if (!lockAcquired) {
      throw httpError(
        'PIN confirmation is already in progress',
        409,
        'DCB_CONFIRM_IN_PROGRESS',
      );
    }
    localConfirmLocks.add(lockKey);
    try {
      await callProvider({
        ctx: {
          ...ctx,
          purchaseTypeId: String(correlation.purchaseTypeId || ''),
        },
        callType: ApiCallType.DCB_CONFIRM,
        action: 'confirm',
        execute: () =>
          provider.confirm(ctx.config, {
            ...providerInput(ctx),
            purchaseTypeId: correlation.purchaseTypeId,
            providerRequestId: correlation.providerRequestId,
            pin,
          }),
        statusLabel: 'POLLING',
      });
      await clearCorrelation(key);
      return {
        campaignId: ctx.campaign.id,
        serviceId: ctx.serviceId,
        outcome: DCB_OUTCOMES.PENDING,
        status: null,
        stage: 'POLLING',
      };
    } catch (err) {
      await redisService.del(lockKey);
      throw err;
    } finally {
      localConfirmLocks.delete(lockKey);
    }
  };

  return {
    getPublicConfig,
    getRuntimeConfig,
    manualCheck,
    pinSinglePackIfEnabled,
    requestPincode,
    confirm,
    status,
  };
};
