import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { flowEngineService } from '../core/engine.js';
import { cappingService } from '../../campaigns/capping.service.js';
import { resolvePurchaseTypeId } from '../helpers/universe-dcb-purchase-types.js';
import { buildUniverseDcbLogRecord } from '../helpers/universe-dcb-log.js';
import {
  httpError,
  cleanPhone,
  parseConfig,
  pickDcbExposeRequestId,
  requestCorrelationKey,
  loadCorrelation,
  resolveAssignedVendor,
} from './dcb-expose-session.js';
import { ensureExposeVisit } from './dcb-expose-inbound.service.js';

const getCampaignRepo = () => getRepository(Campaign);
const getApiConfigRepo = () => getRepository(ApiConfig);

export const assertDcbApiExpose = (campaign) => {
  if (!campaign) throw httpError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
  const mode = flowEngineService.normalizeMode(campaign.verificationMode);
  const flowConfig = flowEngineService.parseFlowConfig(campaign.flowConfig);
  if (mode !== 'UNIVERSE_DCB' || !flowEngineService.isApiExposeFlow(flowConfig)) {
    throw httpError(
      'This campaign does not expose DCB billing APIs. Set Universe Telecom DCB → API expose in Subscription flow.',
      400,
      'DCB_EXPOSE_REQUIRED',
    );
  }
  if (!campaign.active) {
    throw httpError('This offer is not available', 403, 'CAMPAIGN_INACTIVE');
  }
};

export const callProvider = async ({ ctx, callType, action, execute, statusLabel }) => {
  try {
    const response = await execute();
    let resolvedStatus = statusLabel;
    if (typeof statusLabel === 'function') {
      try {
        resolvedStatus = statusLabel(response);
      } catch {
        resolvedStatus = 'PARSE_ERROR';
      }
    }
    return {
      response,
      providerLog: buildUniverseDcbLogRecord({
        ctx,
        callType,
        action,
        response,
        statusLabel: resolvedStatus,
      }),
    };
  } catch (err) {
    err.providerLog = buildUniverseDcbLogRecord({
      ctx,
      callType,
      action,
      error: err,
      statusLabel: 'FAILED',
    });
    throw err;
  }
};

export const providerInput = (ctx) => ({
  msisdn: ctx.msisdn,
  serviceId: ctx.serviceId,
  purchaseTypeId: ctx.purchaseTypeId,
  transactionChannel: ctx.transactionChannel,
});

export const loadExposeContext = async (input = {}) => {
  const {
    campaignId,
    vendorId,
    msisdn,
    purchaseTypeId,
    pack,
    transactionChannel,
    serviceId,
    clientIp,
    requestUrl,
    existingVisit,
  } = input || {};
  const cId = parseInt(campaignId, 10);
  if (!cId) throw httpError('campaignId is required', 400, 'CAMPAIGN_REQUIRED');
  let campaign = await getCampaignRepo().findOne({ where: { id: cId } });
  assertDcbApiExpose(campaign);

  let correlation = null;
  const incomingRequestId = pickDcbExposeRequestId(input);

  // Initial PIN request: evaluate capping
  if (!incomingRequestId) {
    const cappingResult = await cappingService.evaluateCapping(campaign, {
      vendorId,
    });
    if (cappingResult.isCapped) {
      if (
        cappingResult.action === 'fallback' &&
        cappingResult.targetCampaign
      ) {
        campaign = cappingResult.targetCampaign;
      } else {
        throw httpError(
          'Offer is stopped due to capping limit',
          403,
          'OFFER_STOPPED',
        );
      }
    }
  }

  const { vendor, tracking } = await resolveAssignedVendor(campaign, vendorId);

  if (incomingRequestId) {
    correlation = await loadCorrelation(
      requestCorrelationKey(campaign.id, vendor.id, incomingRequestId),
    );
    if (!correlation) {
      throw httpError(
        'requestId is missing or expired. Call pincode first and send the returned requestId.',
        409,
        'DCB_CORRELATION_REQUIRED',
      );
    }
    if (String(correlation.providerRequestId) !== incomingRequestId) {
      throw httpError(
        'requestId does not match PIN request',
        409,
        'DCB_REQUEST_ID_MISMATCH',
      );
    }
  }

  const phone = cleanPhone(msisdn || correlation?.msisdn);
  if (msisdn && correlation?.msisdn && phone !== String(correlation.msisdn)) {
    throw httpError('msisdn does not match PIN request', 409, 'DCB_MSISDN_MISMATCH');
  }

  const apiConfig = await getApiConfigRepo().findOne({
    where: { campaignId: campaign.id },
  });
  const config = parseConfig(apiConfig?.dcbConfigJson);
  const visit = await ensureExposeVisit({
    campaign,
    phone,
    vendorId: vendor.id,
    clientIp,
    landingUrl: requestUrl,
    existingVisit,
    reuseVisitId: correlation?.visitId,
    allowMissingMsisdn: true,
  });

  if (!incomingRequestId) {
    await cappingService.incrementCampaignClickCount(
      campaign.id,
      campaign.cappingInterval,
      vendor.id,
    );
  }
  if (!phone) throw httpError('MSISDN is required', 400, 'MSISDN_REQUIRED');

  const rawChannel = String(
    transactionChannel || correlation?.transactionChannel || 'Wifi',
  ).trim();
  const channel =
    rawChannel.toUpperCase() === 'HE'
      ? 'HE'
      : rawChannel.toLowerCase() === 'wifi' || !rawChannel
        ? 'Wifi'
        : '';
  if (!channel) {
    throw httpError(
      'Transaction channel must be HE or Wifi',
      400,
      'TRANSACTION_CHANNEL_REQUIRED',
    );
  }

  return {
    campaign,
    vendor,
    tracking,
    config,
    correlation,
    msisdn: phone,
    visit,
    visitId: visit.id,
    serviceId: String(
      serviceId || correlation?.serviceId || config.serviceId || campaign.serviceId || '',
    ).trim(),
    purchaseTypeId: resolvePurchaseTypeId(config, {
      purchaseTypeId: purchaseTypeId || correlation?.purchaseTypeId || '',
      pack,
    }),
    transactionChannel: channel,
    source: 'dcb_expose',
  };
};
