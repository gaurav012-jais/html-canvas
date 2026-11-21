import { In } from 'typeorm';
import { ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';
import { VisitEventType } from '../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { describeVendorFireDecision } from '../helpers/operator-callback-status.js';

export function createPostbackDetailQuery(deps, scope) {
  const {
    getPostbackRepo,
    getVendorRepo,
    getCampaignRepo,
    getVisitEventRepo,
    getApiCallLogRepo,
    getTrackingRepo,
  } = deps;
  const { assertPostbackAccess, serializePostback } = scope;

  const getPostbackById = async (id, userId) => {
    const row = await getPostbackRepo().findOne({
      where: { id: parseInt(id, 10) },
    });
    if (!row) {
      const err = new Error('Postback not found');
      err.statusCode = 404;
      throw err;
    }
    await assertPostbackAccess(row, userId);

    let vendor = null;
    if (row.vendorId) {
      vendor = await getVendorRepo().findOne({ where: { id: row.vendorId } });
    }
    const vendorMap = vendor ? { [vendor.id]: vendor } : {};

    let campaign = null;
    if (row.campaignId) {
      campaign = await getCampaignRepo().findOne({
        where: { id: parseInt(row.campaignId, 10) },
        select: ['id', 'name', 'country', 'operator'],
      });
    }
    const campaignMap = campaign ? { [campaign.id]: campaign } : {};

    let billingReceived = false;
    let billingReceivedAt = null;
    if (row.visitId) {
      const ev = await getVisitEventRepo().findOne({
        where: {
          visitId: row.visitId,
          eventType: VisitEventType.CALLBACK_RECEIVED,
        },
        order: { id: 'DESC' },
      });
      if (ev) {
        billingReceived = true;
        billingReceivedAt = ev.createdAt || null;
      }
      const billLog = await getApiCallLogRepo().findOne({
        where: {
          visitId: row.visitId,
          callType: ApiCallType.BILLING_CALLBACK,
        },
        order: { id: 'DESC' },
      });
      if (billLog) {
        billingReceived = true;
        billingReceivedAt = billingReceivedAt || billLog.createdAt || null;
      }
    }
    if (
      !billingReceived &&
      (row.status === ConversionPostbackStatus.RECEIVED ||
        row.status === ConversionPostbackStatus.SENT ||
        row.status === ConversionPostbackStatus.FAILED)
    ) {
      billingReceived = true;
      billingReceivedAt = row.sentAt || row.updatedAt || null;
    }

    const vendorFired =
      Boolean(row.sentAt) ||
      row.status === ConversionPostbackStatus.SENT ||
      row.status === ConversionPostbackStatus.FAILED ||
      row.status === ConversionPostbackStatus.SKIPPED;

    let allowedConfig = null;
    try {
      if (row.campaignId && row.vendorId && getTrackingRepo) {
        const tracking = await getTrackingRepo().findOne({
          where: {
            campaignId: parseInt(row.campaignId, 10),
            vendorId: parseInt(row.vendorId, 10),
          },
        });
        if (tracking?.allowedCallbackStatuses?.trim()) {
          allowedConfig = tracking.allowedCallbackStatuses.trim();
        }
      }
      if (!allowedConfig && vendor?.allowedCallbackStatuses?.trim()) {
        allowedConfig = vendor.allowedCallbackStatuses.trim();
      }
      if (!allowedConfig && row.campaignId && getCampaignRepo) {
        const campaign = await getCampaignRepo().findOne({
          where: { id: parseInt(row.campaignId, 10) },
        });
        if (campaign?.allowedCallbackStatuses?.trim()) {
          allowedConfig = campaign.allowedCallbackStatuses.trim();
        }
      }
    } catch {
      allowedConfig = null;
    }
    const fireDecision = row.operatorStatus
      ? describeVendorFireDecision(row.operatorStatus, allowedConfig)
      : describeVendorFireDecision('', allowedConfig);
    const vendorFireSkipReason =
      billingReceived &&
      !vendorFired &&
      row.operatorStatus &&
      fireDecision &&
      !fireDecision.shouldFire
        ? fireDecision.info
        : null;

    let relatedLogs = [];
    if (row.visitId) {
      relatedLogs = await getApiCallLogRepo().find({
        where: {
          visitId: row.visitId,
          callType: In([
            ApiCallType.BILLING_CALLBACK,
            ApiCallType.VENDOR_POSTBACK,
          ]),
        },
        order: { id: 'DESC' },
        take: 10,
      });
    }

    return {
      ...serializePostback(row, vendorMap, campaignMap),
      lifecycle: {
        created: true,
        createdAt: row.createdAt,
        billingReceived,
        billingReceivedAt,
        operatorStatus: row.operatorStatus || null,
        allowedStatuses: fireDecision.allowedLabel,
        receivedStatus: row.operatorStatus || fireDecision.received || null,
        vendorFireSkipReason,
        vendorFired,
        vendorFireStatus: row.status,
        vendorName: vendor?.name || null,
        vendorCode: vendor?.code || null,
      },
      relatedLogs: relatedLogs.map((l) => ({
        id: l.id,
        callType: l.callType,
        requestUrl: l.requestUrl,
        responseStatus: l.responseStatus,
        success: l.success,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
      })),
    };
  };

  return { getPostbackById };
}
