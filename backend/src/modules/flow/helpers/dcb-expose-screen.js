/**
 * Vendor-facing DCB billing HTML: packs → number → PIN → poll status.
 * Same contract as the downloaded API JSON (config → pincode → confirm → status).
 */

import { renderDcbExposeHtml } from './dcb-expose-template.js';

export function buildDcbExposeScreenUrls(origin, campaignId, vendorId) {
  const host = String(origin || 'https://your-domain.com').replace(/\/$/, '');
  const cid = campaignId || '{campaignId}';
  const vid = vendorId || '{vendorId}';
  const base = `${host}/api/flow/dcb/${cid}/${vid}`;
  return {
    base,
    configUrl: `${base}/config`,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status`,
    screenUrl: `${base}/screen`,
  };
}

function jsLiteral(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildDcbExposeHtmlScreen({
  origin,
  campaignId,
  vendorId,
  absolute = false,
} = {}) {
  const cid = campaignId || '{campaignId}';
  const vid = vendorId || '{vendorId}';
  const host = absolute ? String(origin || '').replace(/\/$/, '') : '';
  const base = `${host}/api/flow/dcb/${cid}/${vid}`;
  const cfg = jsLiteral({
    configUrl: `${base}/config`,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status`,
    purchaseTypeId: '',
    transactionChannel: 'Wifi',
    pollMs: 2000,
    timeoutMs: 60000,
  });

  return renderDcbExposeHtml({ cfg });
}
