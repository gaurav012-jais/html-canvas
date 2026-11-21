import { ApiCallType } from '../../../../database/entities/api-call-log.entity.js';
import { parseOperatorStatus } from '../operator-callback-status.js';

export const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

export const serializeBody = (data) => {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
};

export const callAnalytics = async (method, ...args) => {
  const { analyticsService } =
    await import('../../../analytics/analytics.service.js');
  return analyticsService[method](...args);
};

export const parseCallbackClickId = (query = {}) =>
  String(
    query?.click_id || query?.clickId || query?.ext_id || query?.extId || '',
  ).trim();

export const parseCallbackMsisdn = (query = {}) =>
  String(query?.msisdn || query?.phone || '').replace(/\D/g, '');

/**
 * Always store the inbound billing callback.
 * Recover conversion when click_id / msisdn exists in our system.
 * Unknown click_id, or msisdn-only not in system → success: false (still logged).
 * Every query is written to the hit file, including skip / false / unmatched.
 */
export const persistHit = async (appendHit, query, result = {}) => {
  const skipped = Boolean(result.skipped || result.vendorSkipped);
  const success = result.success === true && !skipped;
  const operatorStatus = parseOperatorStatus(query);
  let statusLabel = String(operatorStatus || 'OK').toUpperCase();
  if (skipped) statusLabel = 'SKIPPED';
  else if (result.success === false) statusLabel = 'FAILED';
  await appendHit({
    callType: ApiCallType.BILLING_CALLBACK,
    msisdn: parseCallbackMsisdn(query) || null,
    clickId: parseCallbackClickId(query) || null,
    requestUrl: '/api/flow/callback',
    requestBody: serializeBody({
      query,
      skipped,
      success: result.success === true,
      reason: result.reason || result.error || null,
      id: result.id || null,
      operatorStatus,
      vendorFired: result.vendorFired === true,
    }),
    responseStatus: 200,
    success,
    statusLabel,
    errorMessage: result.reason || result.error || null,
    query,
    reason: result.reason || result.error || '',
    createdAt: new Date(),
  });
};
