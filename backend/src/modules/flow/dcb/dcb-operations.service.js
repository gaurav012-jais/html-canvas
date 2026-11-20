/**
 * Universe DCB State Machine & Flow Operations
 */

import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import {
  DCB_OUTCOMES,
  getNestedValue,
  normalizeUniverseDcbResponse,
} from '../helpers/universe-dcb-normalizer.js';
import {
  mergePurchaseTypeMappings,
  resolveSinglePackPlan,
} from '../helpers/universe-dcb-purchase-types.js';
import {
  isExplicitHomeDestination,
  resolveDcbNextPage,
} from '../helpers/universe-dcb-runtime.js';
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
  readProviderPurchaseTypes,
} from './dcb-provider-caller.js';

export const createDcbOperations = (provider, callLogger) => {
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
    // Deliberately no subscription cache: status is authoritative and always fresh.
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

  const manualCheck = async (input) => {
    const ctx = await loadDcbContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    const response = await callProvider({
      ctx,
      callType: ApiCallType.DCB_SUBSCRIPTIONS,
      action: 'manual-check',
      execute: () =>
        provider.getSubscriptions(ctx.config, providerInput(ctx)),
      statusLabel: (providerResponse) =>
        normalize(providerResponse, ctx).outcome,
    });
    const result = normalize(response, ctx);
    const customNextPage = resolveDcbNextPage(
      result.outcome,
      result.status,
      ctx.checksubConfig,
    );
    if (result.outcome === DCB_OUTCOMES.ENTITLED || customNextPage === 'THANKYOU') {
      return {
        campaignId: ctx.campaign.id,
        serviceId: ctx.serviceId,
        ...result,
        nextPage: 'THANKYOU',
        outcome: DCB_OUTCOMES.ENTITLED,
        stage: 'ENTITLED',
        checksubConfig: ctx.checksubConfig || null,
        flowContext: {
          provider: 'UNIVERSE_DCB',
          verificationMode: 'UNIVERSE_DCB',
          stage: 'ENTITLED',
          outcome: DCB_OUTCOMES.ENTITLED,
          status: result.status,
        },
      };
    }

    const hasCustomRules = Boolean(
      ctx.checksubConfig &&
      Array.isArray(ctx.checksubConfig.rules) &&
      ctx.checksubConfig.rules.length > 0,
    );
    // Custom status rules win. Otherwise a new subscriber lands on the pack page.
    const nextPage = hasCustomRules && customNextPage ? customNextPage : 'HOME';
    const offerPlan =
      nextPage === 'HOME' &&
      !isExplicitHomeDestination(result.status, ctx.checksubConfig);

    if (offerPlan && ctx.config.skipSinglePackPage === true) {
      const providerTypes = await readProviderPurchaseTypes(ctx, provider);
      const decision = resolveSinglePackPlan(ctx.config, providerTypes);
      const canBill =
        result.outcome === DCB_OUTCOMES.NEW ||
        result.outcome === DCB_OUTCOMES.PENDING;
      if (decision.action === 'pin' && canBill) {
        const pinned = await requestPincode({
          ...input,
          purchaseTypeId: decision.pack.purchaseTypeId,
          transactionChannel: ctx.transactionChannel || 'Wifi',
        });
        return {
          ...pinned,
          checksubConfig: ctx.checksubConfig || null,
        };
      }
      if (decision.action === 'none' && canBill) {
        throw httpError(
          'No packs are available for this campaign.',
          409,
          'DCB_NO_PACKS',
        );
      }
      // One pack (or none): low balance, failure, and other outcomes skip the picker.
      if (decision.action === 'pin' || decision.action === 'none') {
        const realPage = resolveDcbNextPage(
          result.outcome,
          result.status,
          ctx.checksubConfig,
        );
        if (realPage && realPage !== 'HOME') {
          return {
            campaignId: ctx.campaign.id,
            serviceId: ctx.serviceId,
            ...result,
            nextPage: realPage,
            checksubConfig: ctx.checksubConfig || null,
            stage: realPage,
            flowContext: {
              provider: 'UNIVERSE_DCB',
              verificationMode: 'UNIVERSE_DCB',
              stage: realPage,
              outcome: result.outcome,
              status: result.status,
            },
          };
        }
      }
    }

    return {
      campaignId: ctx.campaign.id,
      serviceId: ctx.serviceId,
      ...result,
      nextPage,
      checksubConfig: ctx.checksubConfig || null,
      stage: nextPage === 'HOME' ? 'PLAN_SELECT' : (result.stage || 'PLAN_SELECT'),
      flowContext: {
        provider: 'UNIVERSE_DCB',
        verificationMode: 'UNIVERSE_DCB',
        stage: nextPage === 'HOME' ? 'PLAN_SELECT' : 'PIN_REQUIRED',
        outcome: result.outcome,
        status: result.status,
      },
    };
  };

  /**
   * When skipSinglePackPage is on and exactly one pack is usable, send its PIN.
   * Returns null to keep the pack page. Throws when no pack remains or the PIN request fails.
   */
  const pinSinglePackIfEnabled = async (input) => {
    const ctx = await loadDcbContext(input, {
      requireMsisdn: true,
      requireVisit: true,
    });
    if (ctx.config.skipSinglePackPage !== true) return null;
    if (isExplicitHomeDestination(input.status, ctx.checksubConfig)) return null;
    const providerTypes = await readProviderPurchaseTypes(ctx, provider);
    const decision = resolveSinglePackPlan(ctx.config, providerTypes);
    if (decision.action === 'none') {
      throw httpError(
        'No packs are available for this campaign.',
        409,
        'DCB_NO_PACKS',
      );
    }
    if (decision.action !== 'pin') return null;
    const channel = ctx.transactionChannel || 'Wifi';
    return requestPincode({
      ...input,
      purchaseTypeId: decision.pack.purchaseTypeId,
      transactionChannel: channel,
    });
  };

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
