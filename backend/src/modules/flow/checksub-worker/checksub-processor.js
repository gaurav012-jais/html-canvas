/**
 * Delayed Checksub Row Processor
 */

import { getRepository } from '../../../database/index.js';
import { ConversionPostback } from '../../../database/entities/conversion-postback.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { redisService } from '../../../common/services/redis.service.js';
import { orangeBfProvider } from '../orange-bf.provider.js';
import { universeDcbProvider } from '../universe-dcb.provider.js';
import { DCB_OUTCOMES, normalizeUniverseDcbResponse } from '../helpers/universe-dcb-normalizer.js';
import { partnerApiService } from '../partner-api.service.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { analyticsService } from '../../analytics/analytics.service.js';
import { interpretChecksubResponse } from '../helpers/checksub-rules.js';
import {
  classifyChecksubStatus,
  safeParseJson,
  getDcbEndpointUrl,
  loadProviderConfig,
  LOCK_TTL_SECONDS,
  LOG_PREFIX,
} from './checksub-status.util.js';

/**
 * Process a single pending postback row.
 */
export const processRow = async (postback, { force = false } = {}) => {
  const { id, msisdn, campaignId } = postback;
  const lockKey = `checksub:delayed:lock:${msisdn}`;

  // Acquire distributed Redis lock (30 s TTL) to avoid duplicate processing
  let lockAcquired = false;
  try {
    lockAcquired = await redisService.setNx(lockKey, String(id), LOCK_TTL_SECONDS);
  } catch (redisErr) {
    console.warn(`${LOG_PREFIX} Redis setNx failed for msisdn=${msisdn}:`, redisErr.message);
    return; // Skip — cannot safely acquire lock
  }

  if (!lockAcquired) {
    console.log(`${LOG_PREFIX} Lock not acquired for msisdn=${msisdn} (another worker active) — skipping.`);
    return;
  }

  try {
    // Re-fetch the row inside the lock to guard against race conditions
    const repo = getRepository(ConversionPostback);
    const fresh = await repo.findOne({ where: { id } });

    if (!fresh) {
      console.warn(`${LOG_PREFIX} Postback id=${id} not found — skipping.`);
      return;
    }

    if (!force && fresh.delayedChecksubStatus !== 'pending' && fresh.delayedChecksubStatus !== null) {
      console.log(
        `${LOG_PREFIX} Postback id=${id} status is '${fresh.delayedChecksubStatus}' (already processed) — skipping.`,
      );
      return;
    }

    // Determine campaign verification mode
    const campaign = campaignId
      ? await getRepository(Campaign).findOne({ where: { id: parseInt(campaignId, 10) } })
      : null;
    const apiConfig = campaignId
      ? await getRepository(ApiConfig).findOne({ where: { campaignId: parseInt(campaignId, 10) } })
      : null;

    const vMode = String(campaign?.verificationMode || '').toUpperCase();
    const isOrangeBf = vMode === 'ORANGE_BF';
    const isUniverseDcb = vMode === 'UNIVERSE_DCB';

    let checkResult = null;
    let rawResponse = {};
    let rawStatusValue = '';
    let callType = ApiCallType.CHECKSUB;
    let requestUrl = '';

    if (isOrangeBf) {
      callType = ApiCallType.ORANGE_BF_CHECKSUB;
      const config = await loadProviderConfig(campaignId);
      console.log(`${LOG_PREFIX} Calling Orange BF checkSubscription for postback id=${id}, msisdn=${msisdn}`);
      checkResult = await orangeBfProvider.checkSubscription({
        msisdn,
        serviceId: config.serviceId,
        subServiceId: config.subServiceId,
        cpId: config.cpId,
        channel: config.channel,
        country: config.country,
        operator: config.operator,
        context: {
          campaignId: campaignId ? String(campaignId) : '',
          visitId: String(fresh.visitId || ''),
        },
        config,
      });
      requestUrl = checkResult.requestUrl;
      rawResponse = checkResult.rawResponse || {};
      const interpreted = interpretChecksubResponse(rawResponse, config.checksubConfigJson);
      rawStatusValue = interpreted?.status || checkResult.outcome || '';
    } else if (isUniverseDcb && apiConfig?.dcbConfigJson) {
      callType = ApiCallType.DCB_SUBSCRIPTIONS;
      console.log(`${LOG_PREFIX} Calling Universe DCB getSubscriptions for postback id=${id}, msisdn=${msisdn}`);
      const dcbConfig = safeParseJson(apiConfig.dcbConfigJson);
      try {
        const dcbResp = await universeDcbProvider.getSubscriptions(dcbConfig, {
          msisdn,
          serviceId: campaign?.serviceId || dcbConfig.serviceId,
        });
        requestUrl = getDcbEndpointUrl(dcbConfig.baseUrl, '/api/dcb/subscriptions');
        rawResponse = dcbResp.data || {};
        const normalized = normalizeUniverseDcbResponse(rawResponse, dcbConfig, {
          serviceId: campaign?.serviceId || dcbConfig.serviceId,
        });
        rawStatusValue =
          normalized?.outcome === DCB_OUTCOMES.ENTITLED
            ? 'ACTIVE'
            : (normalized?.status || normalized?.outcome || '');
        checkResult = {
          success: Boolean(rawStatusValue && rawStatusValue !== 'TERMINAL_FAILURE' && rawStatusValue !== 'PARSE_ERROR'),
          httpStatus: dcbResp.status || 200,
          outcome: rawStatusValue,
          rawResponse,
        };
      } catch (dcbErr) {
        console.warn(`${LOG_PREFIX} Universe DCB checksub error:`, dcbErr.message);
        rawResponse = dcbErr.providerData || { error: dcbErr.message };
        rawStatusValue = dcbErr.operatorMessage || dcbErr.code || 'FAILED';
        checkResult = {
          success: false,
          httpStatus: dcbErr.providerStatus || 500,
          outcome: rawStatusValue,
          rawResponse,
          errorMessage: dcbErr.message,
        };
      }
    } else if (apiConfig?.subscriptionApi) {
      callType = ApiCallType.CHECKSUB;
      console.log(`${LOG_PREFIX} Calling partnerApiService.checkSubscription for postback id=${id}, msisdn=${msisdn}`);
      const checkOutcome = await partnerApiService.checkSubscription(apiConfig, {
        phone: msisdn,
        msisdn,
        visitId: fresh.visitId,
        campaignId,
        country: campaign?.country,
        operator: campaign?.operator,
        serviceId: campaign?.serviceId,
        skipCache: true,
      });
      requestUrl = apiConfig.subscriptionApi;
      rawResponse = checkOutcome;
      rawStatusValue = checkOutcome.status || (checkOutcome.isActive ? 'active' : 'inactive');
      checkResult = {
        success: Boolean(checkOutcome.status && checkOutcome.status !== 'unknown'),
        httpStatus: 200,
        outcome: rawStatusValue,
        rawResponse: checkOutcome,
      };
    } else {
      console.log(`${LOG_PREFIX} No checksub URL configured for campaign id=${campaignId} — skipping.`);
      await repo.update(
        { id },
        {
          delayedChecksubStatus: 'skipped',
          delayedChecksubExecutedAt: new Date(),
          delayedChecksubOutcome: 'no_checksub_url',
        },
      );
      return;
    }

    // Classify operator checksub status:
    // Only ACTIVE is success. GRACE, PARKING, PENDING, SUSPENDED etc. are non-success.
    const classification = classifyChecksubStatus(rawStatusValue);
    const { statusLabel, isSuccess } = classification;

    // Build update payload for conversion_postbacks
    const updatePayload = {
      delayedChecksubExecutedAt: new Date(),
      delayedChecksubResponse: JSON.stringify(rawResponse).slice(0, 2000),
      delayedChecksubStatus: isSuccess ? 'completed' : 'failed',
      delayedChecksubOutcome: statusLabel,
      operatorStatus: statusLabel,
    };

    await repo.update({ id }, updatePayload);

    // Update visits table for operator audit
    let targetVisitId = fresh.visitId;
    try {
      const visitRepo = getRepository(Visit);
      if (!targetVisitId && msisdn) {
        const v = await visitRepo.findOne({
          where: { phone: msisdn },
          order: { id: 'DESC' },
        });
        if (v?.id) targetVisitId = v.id;
      }

      if (targetVisitId) {
        await visitRepo.update(
          { id: targetVisitId },
          {
            checksubStatus: statusLabel,
            checksubExecutedAt: new Date(),
            checksubResponse: JSON.stringify(rawResponse).slice(0, 2000),
          },
        );

        try {
          await analyticsService.logEvent(
            targetVisitId,
            'CHECKSUB_30M',
            {
              source: isOrangeBf ? 'orange_bf' : isUniverseDcb ? 'universe_dcb' : 'checksub',
              phone: msisdn,
              status: statusLabel,
              success: isSuccess,
            },
          );
        } catch {}
      }
    } catch (visitErr) {
      console.warn(`${LOG_PREFIX} Failed to update visit for postback id=${id}:`, visitErr.message);
    }

    console.log(
      `${LOG_PREFIX} Postback id=${id} → status=${updatePayload.delayedChecksubStatus}, outcome=${updatePayload.delayedChecksubOutcome}`,
    );

    // Log the API call
    try {
      const requestBodyRaw = checkResult.requestBody
        ? typeof checkResult.requestBody === 'string'
          ? checkResult.requestBody
          : JSON.stringify(checkResult.requestBody)
        : JSON.stringify({ msisdn, isDelayedChecksub: true });

      let requestBodyParsed;
      try {
        requestBodyParsed = JSON.parse(requestBodyRaw);
      } catch {
        requestBodyParsed = { raw: requestBodyRaw };
      }

      await apiCallLogService.record({
        visitId: targetVisitId || null,
        vendorId: fresh.vendorId || null,
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        msisdn,
        callType,
        requestUrl: requestUrl || checkResult.requestUrl,
        requestBody: JSON.stringify({ ...requestBodyParsed, isDelayedChecksub: true }),
        responseStatus: checkResult.httpStatus || 200,
        responseBody: checkResult.rawResponse,
        success: checkResult.success,
        errorMessage: checkResult.success ? null : checkResult.responseMessage,
        statusLabel: checkResult.outcome,
      });
    } catch (logErr) {
      console.warn(`${LOG_PREFIX} apiCallLogService.record failed for postback id=${id}:`, logErr.message);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Error processing postback id=${id}:`, err.message);

    // Mark as failed so we don't retry indefinitely on hard errors
    try {
      await getRepository(ConversionPostback).update(
        { id },
        {
          delayedChecksubStatus: 'failed',
          delayedChecksubExecutedAt: new Date(),
          delayedChecksubOutcome: 'error',
          delayedChecksubResponse: JSON.stringify({ error: err.message }).slice(0, 2000),
        },
      );
    } catch (updateErr) {
      console.error(`${LOG_PREFIX} Failed to mark postback id=${id} as failed:`, updateErr.message);
    }
  } finally {
    // Always release the lock
    try {
      await redisService.del(lockKey);
    } catch (delErr) {
      console.warn(`${LOG_PREFIX} Failed to release lock for msisdn=${msisdn}:`, delErr.message);
    }
  }
};
