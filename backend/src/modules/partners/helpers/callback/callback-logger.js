import { VisitEventType } from '../../../../database/entities/visit-event.entity.js';
import { ApiCallType } from '../../../../database/entities/api-call-log.entity.js';
import { maskPhone, serializeBody } from './callback-parser.js';

export const createCallbackLogger = ({ logEvent, logApiCall, query, status, clickId, incomingMsisdn }) => {
  const logInbound = async (
    visitId,
    campaignId,
    rowClickId,
    rcid,
    msisdn,
    extra = {},
  ) => {
    const safeQuery = { ...query };
    if (safeQuery.msisdn) safeQuery.msisdn = maskPhone(safeQuery.msisdn);
    if (safeQuery.phone) safeQuery.phone = maskPhone(safeQuery.phone);
    const matched = extra.matched !== false;

    if (visitId) {
      const fired = extra.vendorFired === true;
      const held = extra.vendorFired === false;
      const skipInfo = `Vendor postback not sent because received status "${
        extra.receivedStatus || extra.operatorStatus || status
      }" is not in allowed statuses [${
        extra.allowedStatuses || 'active, success, ok, subscribed, 1, true'
      }].`;
      const info =
        extra.info ||
        (matched
          ? held
            ? skipInfo
            : fired
              ? 'Billing / operator callback received — firing vendor postback.'
              : 'Billing / operator callback received.'
          : 'Billing / operator callback received — not matched in our system.');
      const payload = {
        msisdn: maskPhone(msisdn),
        clickId: rowClickId || clickId || null,
        status,
        ...extra,
        info,
        reason: held ? info : extra.reason,
      };
      await logEvent(visitId, VisitEventType.CALLBACK_RECEIVED, payload);
    }
    const heldCall = extra.vendorFired === false;
    const skipInfo = `Vendor postback not sent because received status "${
      extra.receivedStatus || extra.operatorStatus || status
    }" is not in allowed statuses [${
      extra.allowedStatuses || 'active, success, ok, subscribed, 1, true'
    }].`;
    await logApiCall({
      visitId: visitId || null,
      campaignId: campaignId || null,
      msisdn: msisdn || null,
      rcid: rcid || null,
      clickId: rowClickId || clickId || null,
      callType: ApiCallType.BILLING_CALLBACK,
      requestUrl: '/api/flow/callback',
      requestBody: serializeBody({
        msisdn: maskPhone(msisdn),
        clickId: rowClickId || clickId || null,
        status,
        query: safeQuery,
        ...extra,
        info: heldCall ? extra.info || skipInfo : extra.info,
        reason: heldCall ? extra.info || skipInfo : extra.reason,
      }),
      responseStatus: 200,
      responseBody: null,
      success: matched,
      statusLabel: matched
        ? String(status || 'RECEIVED')
            .toUpperCase()
            .slice(0, 32)
        : 'UNMATCHED',
    });
  };

  const reject = async (reason) => {
    await logInbound(
      null,
      null,
      clickId || null,
      null,
      incomingMsisdn || null,
      {
        action: 'unmatched',
        reason,
        matched: false,
      },
    );
    return { success: false, skipped: true, reason };
  };

  return { logInbound, reject };
};
