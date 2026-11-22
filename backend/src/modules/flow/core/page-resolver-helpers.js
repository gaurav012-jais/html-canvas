import { redisService } from '../../../common/services/redis.service.js';

export async function fetchCachedApiConfig({
  campaignId,
  isFlowCacheEnabled,
  getFlowCacheTtl,
  getApiConfigRepo,
}) {
  const apiConfigCacheKey = `flow:config:${campaignId}`;
  let apiConfig = null;

  if (isFlowCacheEnabled()) {
    apiConfig = await redisService.get(apiConfigCacheKey);
  }

  if (apiConfig === null || !isFlowCacheEnabled()) {
    apiConfig = await getApiConfigRepo().findOne({
      where: { campaignId },
    });
    if (isFlowCacheEnabled()) {
      await redisService.set(
        apiConfigCacheKey,
        apiConfig ?? '__NULL__',
        getFlowCacheTtl?.() || 600,
      );
    }
  } else if (apiConfig === '__NULL__') {
    apiConfig = null;
  }

  return apiConfig;
}
