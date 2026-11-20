/**
 * Universe DCB Provider Caller & Logger Utility
 */

import { universeDcbProvider } from '../universe-dcb.provider.js';
import { buildUniverseDcbLogRecord } from '../helpers/universe-dcb-log.js';
import { getNestedValue } from '../helpers/universe-dcb-normalizer.js';
import { stripProviderRequestIds } from './dcb-context.service.js';

export const providerInput = (ctx) => ({
  msisdn: ctx.msisdn,
  serviceId: ctx.serviceId,
  purchaseTypeId: ctx.purchaseTypeId,
  transactionChannel: ctx.transactionChannel,
});

export const callProviderWithLogging = async ({
  ctx,
  callType,
  action,
  execute,
  statusLabel,
  callLogger,
}) => {
  let response;
  try {
    response = await execute();
    let resolvedStatus = statusLabel;
    if (typeof statusLabel === 'function') {
      try {
        resolvedStatus = statusLabel(response);
      } catch {
        resolvedStatus = 'PARSE_ERROR';
      }
    }
    try {
      if (callLogger) {
        await callLogger.record(
          buildUniverseDcbLogRecord({
            ctx,
            callType,
            action,
            response,
            statusLabel: resolvedStatus,
          }),
        );
      }
    } catch (logError) {
      console.warn(`Universe DCB API log write failed: ${logError.message}`);
    }
    return response;
  } catch (error) {
    try {
      if (callLogger) {
        await callLogger.record(
          buildUniverseDcbLogRecord({
            ctx,
            callType,
            action,
            error,
            statusLabel: 'FAILED',
          }),
        );
      }
    } catch (logError) {
      console.warn(`Universe DCB API log write failed: ${logError.message}`);
    }
    throw error;
  }
};

export const readProviderPurchaseTypes = async (
  ctx,
  provider = universeDcbProvider,
) => {
  try {
    const response = await provider.getPublicConfig(
      ctx.config,
      providerInput(ctx),
    );
    const envelopePath = ctx.config.responsePaths?.envelope;
    const providerConfig = envelopePath
      ? getNestedValue(response.data, envelopePath)
      : response.data;
    const safeProviderConfig = stripProviderRequestIds(providerConfig);
    if (!Array.isArray(safeProviderConfig?.purchaseTypes)) return undefined;
    return safeProviderConfig.purchaseTypes;
  } catch (err) {
    console.warn(
      `Universe DCB pack catalog unavailable, using campaign mappings: ${err.message}`,
    );
    return undefined;
  }
};
