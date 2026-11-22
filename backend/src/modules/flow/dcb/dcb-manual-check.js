import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { DCB_OUTCOMES } from '../helpers/universe-dcb-normalizer.js';
import { resolveSinglePackPlan } from '../helpers/universe-dcb-purchase-types.js';
import {
  isExplicitHomeDestination,
  resolveDcbNextPage,
} from '../helpers/universe-dcb-runtime.js';
import { httpError, loadDcbContext } from './dcb-context.service.js';
import { providerInput, readProviderPurchaseTypes } from './dcb-provider-caller.js';

export function createDcbManualCheckHandler({
  provider,
  callProvider,
  normalize,
  requestPincode,
}) {
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

  return { manualCheck, pinSinglePackIfEnabled };
}
