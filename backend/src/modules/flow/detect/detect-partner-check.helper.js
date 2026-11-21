import { partnerApiService } from '../partner-api.service.js';

export const executePartnerChecks = async (apiConfig, partnerCtx, startConfig = {}) => {
  const hasChecksub =
    Boolean(apiConfig?.subscriptionApi) && startConfig.runChecksub !== false;
  const hasBlocklist =
    Boolean(apiConfig?.blocklistApi) && startConfig.runBlocklist !== false;

  let subRes = null;
  let subscribed = false;
  let isActive = false;
  let subscriptionStatus = null;
  let blocked = false;
  let blockReason = null;

  if (hasChecksub || hasBlocklist) {
    const [checksubResult, blockRes] = await Promise.all([
      hasChecksub
        ? partnerApiService
            .checkSubscription(apiConfig, partnerCtx)
            .catch(() => null)
        : Promise.resolve(null),
      hasBlocklist
        ? partnerApiService
            .checkBlocked(apiConfig, partnerCtx)
            .catch(() => ({ blocked: false }))
        : Promise.resolve({ blocked: false }),
    ]);

    subRes = checksubResult;
    subscribed = Boolean(subRes?.shouldSkipSubscribe);
    isActive = Boolean(subRes?.isActive);
    subscriptionStatus = subRes?.status || null;
    blocked = Boolean(blockRes?.blocked);
    blockReason = blockRes?.reason || null;
  }

  return {
    hasChecksub,
    hasBlocklist,
    subRes,
    subscribed,
    isActive,
    subscriptionStatus,
    blocked,
    blockReason,
  };
};
