import { CampaignPageType } from '../../../database/entities/campaign-page.entity.js';

export const DEFAULT_PAGE_FOR_OUTCOME = {
  NO_PHONE: CampaignPageType.OTP,
  BLOCKED: CampaignPageType.BLOCKED,
  RULE_MATCH: CampaignPageType.THANKYOU,
  SUCCESS: CampaignPageType.THANKYOU,
  FAIL: CampaignPageType.ERROR,
};

export function getResponseField(data, key) {
  if (!data || typeof data !== 'object' || !key) return null;
  if (data[key] !== undefined && data[key] !== null) return data[key];
  const snake = String(key)
    .replace(/([A-Z])/g, '_$1')
    .replace(/__/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
  if (snake !== key && data[snake] !== undefined && data[snake] !== null) {
    return data[snake];
  }
  return null;
}

export function readField(json, key) {
  const nested = json?.data && typeof json.data === 'object' ? json.data : null;
  return (
    getResponseField(json, key) ?? (nested ? getResponseField(nested, key) : null)
  );
}

export function normalizeRules(routes) {
  const list = Array.isArray(routes?.rules) ? routes.rules : [];
  return list
    .map((r) => ({
      key: String(r?.key || '').trim(),
      value: r?.value != null ? String(r.value).trim() : '',
      go: r?.go === 'external' ? 'external' : 'page',
      page: String(r?.page || 'THANKYOU').trim().toUpperCase(),
      url: String(r?.url || '').trim(),
    }))
    .filter((r) => r.key && r.value !== '');
}

/** First matching key=value rule on partner/checksub body. */
export function matchRules(body, rules) {
  if (!body || !rules.length) return null;
  for (const rule of rules) {
    const actual = readField(body, rule.key);
    if (actual === undefined || actual === null) continue;
    if (String(actual) === rule.value) {
      return rule;
    }
  }
  return null;
}

export function buildMatchBodyFromChecksub(subCheck) {
  if (!subCheck) return {};
  return {
    currentStatus: subCheck.currentStatus || subCheck.status || '',
    subscriptionStatus: subCheck.subscriptionStatus || '',
    status: subCheck.status || subCheck.currentStatus || '',
    isActive: Boolean(subCheck.isActive),
    shouldSkipSubscribe: Boolean(subCheck.shouldSkipSubscribe),
    blocked: false,
    reason: subCheck.reason || '',
  };
}
