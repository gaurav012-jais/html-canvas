import { getRepository } from '../../../database/index.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { ApiConfig } from '../../../database/entities/api-config.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { CampaignTracking } from '../../../database/entities/campaign-tracking.entity.js';
import {
  ConversionPostback,
  ConversionPostbackStatus,
} from '../../../database/entities/conversion-postback.entity.js';
import { apiCallLogService } from '../api-call-log.service.js';
import { postbackService } from '../../partners/postback.service.js';
import { affiliateRcidFromVisit } from '../../partners/helpers/postback-template.js';
import { resolveApprovalHold } from '../../otp/helpers/approval-control.js';
import { ORANGE_BF_DEFAULTS } from '../orange-bf.provider.js';

export const cleanPhone = (val) => String(val || '').replace(/\D/g, '');

export const isOrangeBfTestMsisdn = (phone) => {
  const digits = cleanPhone(phone);
  if (!digits) return false;
  if (process.env.BYPASS_ORANGE_BF_DUPLICATE_CHECK === 'true') return true;
  const configured = String(process.env.TEST_POSTBACK_MSISDNS || '')
    .split(',')
    .map((s) => cleanPhone(s))
    .filter(Boolean);
  const defaultTestNumbers = ['66649028'];
  const local =
    digits.startsWith('226') && digits.length > 8 ? digits.slice(3) : digits;
  return (
    defaultTestNumbers.includes(digits) ||
    defaultTestNumbers.includes(local) ||
    configured.includes(digits) ||
    configured.includes(local)
  );
};

export const safeParseJson = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const getCampaign = async (campaignId) => {
  if (!campaignId) return null;
  return getRepository(Campaign).findOne({
    where: { id: parseInt(campaignId, 10) },
  });
};

export const getApiConfig = async (campaignId) => {
  if (!campaignId) return null;
  return getRepository(ApiConfig).findOne({
    where: { campaignId: parseInt(campaignId, 10) },
  });
};

export const parseProviderConfig = (apiConfig) => {
  if (!apiConfig) return { ...ORANGE_BF_DEFAULTS };
  try {
    const headersParsed = safeParseJson(apiConfig.headersJson);
    const otpConfigParsed = safeParseJson(apiConfig.otpConfigJson);
    const merged = { ...headersParsed, ...otpConfigParsed };

    let baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
    if (merged.baseUrl) {
      baseUrl = merged.baseUrl;
    } else if (apiConfig.sendUrl) {
      try {
        baseUrl = new URL(apiConfig.sendUrl).origin;
      } catch {
        baseUrl = ORANGE_BF_DEFAULTS.baseUrl;
      }
    }

    return {
      baseUrl,
      otpCooldownMessage: merged.otpCooldownMessage,
      otpBlockedMessage: merged.otpBlockedMessage,
      otpUnavailableMessage: merged.otpUnavailableMessage,
      sendUrl: merged.sendUrl || apiConfig.sendUrl || null,
      sendMethod: (merged.sendMethod || merged.method || 'GET').toUpperCase(),
      sendHeadersJson:
        merged.sendHeadersJson ||
        merged.headersJson ||
        apiConfig.headersJson ||
        null,
      sendBodyJson:
        merged.sendBodyJson || merged.bodyJson || merged.body || null,

      verifyUrl: merged.verifyUrl || apiConfig.verifyUrl || null,
      verifyMethod: (merged.verifyMethod || 'GET').toUpperCase(),
      verifyHeadersJson:
        merged.verifyHeadersJson ||
        merged.headersJson ||
        apiConfig.headersJson ||
        null,
      verifyBodyJson: merged.verifyBodyJson || merged.verifyBody || null,

      checksubUrl: merged.checksubUrl || apiConfig.subscriptionApi || null,
      checksubMethod: (merged.checksubMethod || 'GET').toUpperCase(),
      checksubHeadersJson:
        merged.checksubHeadersJson ||
        merged.headersJson ||
        apiConfig.headersJson ||
        null,
      checksubBodyJson: merged.checksubBodyJson || null,

      unsubUrl: merged.unsubUrl || null,
      unsubMethod: (merged.unsubMethod || 'GET').toUpperCase(),
      unsubHeadersJson:
        merged.unsubHeadersJson ||
        merged.headersJson ||
        apiConfig.headersJson ||
        null,
      unsubBodyJson: merged.unsubBodyJson || null,

      syncUrl: merged.syncUrl || null,
      syncMethod: (merged.syncMethod || 'GET').toUpperCase(),
      syncHeadersJson:
        merged.syncHeadersJson ||
        merged.headersJson ||
        apiConfig.headersJson ||
        null,
      syncBodyJson: merged.syncBodyJson || null,
      syncEnabled:
        merged.syncEnabled !== undefined
          ? Boolean(merged.syncEnabled)
          : true,
      syncServiceId: merged.syncServiceId || null,
      syncSubServiceId: merged.syncSubServiceId || null,
      syncReqType: merged.syncReqType !== undefined ? merged.syncReqType : 1,
      syncCpId: merged.syncCpId || null,
      syncChannel: merged.syncChannel || null,
      syncCountry: merged.syncCountry || null,
      syncOperator: merged.syncOperator || null,

      serviceId: merged.serviceId || ORANGE_BF_DEFAULTS.serviceId,
      subServiceId: merged.subServiceId || ORANGE_BF_DEFAULTS.subServiceId,
      cpId: merged.cpId || ORANGE_BF_DEFAULTS.cpId,
      channel: merged.channel || ORANGE_BF_DEFAULTS.channel,
      country: merged.country || ORANGE_BF_DEFAULTS.country,
      operator: merged.operator || ORANGE_BF_DEFAULTS.operator,
      language: merged.language || ORANGE_BF_DEFAULTS.language,
      successKey:
        merged.successKey || apiConfig.successKey || 'responseCode',
      successValue:
        merged.successValue !== undefined
          ? String(merged.successValue)
          : apiConfig.successValue || '0',
      timeoutMs: Number(merged.timeoutMs) || ORANGE_BF_DEFAULTS.timeoutMs,
    };
  } catch {
    return { ...ORANGE_BF_DEFAULTS };
  }
};

export const resolveVendorForPostback = async (campaignId, vendorId, visitId) => {
  if (vendorId) return parseInt(vendorId, 10);
  if (visitId) {
    const visit = await getRepository(Visit).findOne({
      where: { id: parseInt(visitId, 10) },
    });
    if (visit?.vendorId) return visit.vendorId;
  }
  if (!campaignId) return null;
  const tracking = await getRepository(CampaignTracking).findOne({
    where: { campaignId: parseInt(campaignId, 10), active: true },
    order: { id: 'ASC' },
  });
  return tracking?.vendorId || null;
};

export const queueOrangeBfPostback = async ({
  campaign,
  visitId,
  vendorId,
  msisdn,
}) => {
  const resolvedVendorId = await resolveVendorForPostback(
    campaign.id,
    vendorId,
    visitId,
  );
  let tracking = null;
  if (resolvedVendorId) {
    tracking = await getRepository(CampaignTracking).findOne({
      where: {
        campaignId: campaign.id,
        vendorId: resolvedVendorId,
        active: true,
      },
    });
  }

  const parsedVisitId = visitId ? parseInt(visitId, 10) : null;
  const visit = parsedVisitId
    ? await getRepository(Visit).findOne({ where: { id: parsedVisitId } })
    : null;
  const decision = await resolveApprovalHold({
    campaignId: campaign.id,
    vendorId: resolvedVendorId,
    payoutPercent: tracking?.payoutPercent,
    decisionKey: visit?.clickId || (parsedVisitId ? String(parsedVisitId) : ''),
  });
  const isTest = isOrangeBfTestMsisdn(msisdn);
  const queued = await postbackService.registerPending({
    visitId: parsedVisitId,
    msisdn,
    campaignId: campaign.id,
    vendorId: resolvedVendorId || visit?.vendorId || null,
    clickId: visit?.clickId || '',
    rcid: affiliateRcidFromVisit(visit),
    campid: visit?.campid || '',
    trackingCampid: visit?.trackingCampid || campaign.trackingId || '',
    keepIfSent: !isTest,
    forceFire: isTest,
    fireImmediate: !decision.held,
  });

  if (decision.held && queued?.id) {
    const repo = getRepository(ConversionPostback);
    const row = await repo.findOne({ where: { id: queued.id } });
    if (row && row.status !== ConversionPostbackStatus.SENT) {
      row.status = ConversionPostbackStatus.SKIPPED;
      row.errorMessage = `Payout hold — vendor cut ${100 - decision.payoutPercent}% (seq ${decision.seq})`;
      await repo.save(row);
    }
    await apiCallLogService.record({
      visitId: parsedVisitId,
      campaignId: campaign.id,
      msisdn,
      rcid: row?.rcid || visit?.rcid || null,
      clickId: row?.clickId || visit?.clickId || null,
      vendorId: resolvedVendorId,
      callType: ApiCallType.VENDOR_POSTBACK,
      requestUrl: row?.postbackUrl || '',
      requestBody: JSON.stringify({
        skipped: true,
        reason: 'payout_hold',
        payoutPercent: decision.payoutPercent,
        seq: decision.seq,
        postbackId: queued.id,
        vendorId: resolvedVendorId,
      }),
      success: false,
      errorMessage: `payout hold (${decision.payoutPercent}%)`,
      statusLabel: 'SKIPPED',
    });
    return {
      status: ConversionPostbackStatus.SKIPPED,
      held: true,
      payoutPercent: decision.payoutPercent,
      seq: decision.seq,
    };
  }

  return {
    status: queued?.status || (queued?.skipped ? 'skipped' : 'pending'),
    held: false,
    payoutPercent: decision.payoutPercent,
    seq: decision.seq,
  };
};
