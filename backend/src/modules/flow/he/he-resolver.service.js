import {
  parseJson,
  redirectMeta,
  normalizePhone,
  applySafaricomDummyFallback,
} from './he-helpers.js';
import { resolveSafaricomMasked } from './safaricom-he.service.js';
import { resolveCustomHttp } from './custom-http-he.service.js';

/**
 * Resolves MSISDN via Header Enrichment configuration.
 *
 * @param {object} apiConfig
 * @param {{ phone?: string, country?: string, operator?: string, hint?: string, sessionId?: string, visitId?: number, campaignId?: number, clickId?: string, rcid?: string, heSource?: string, heClientLogs?: object, heClientError?: string }} input
 */
export const resolveHe = async (apiConfig, input = {}) => {
  const provider = String(
    apiConfig?.heProvider ||
      (apiConfig?.resolveMsisdnUrl ? 'custom_http' : 'header'),
  )
    .toLowerCase()
    .trim();

  const heConfig = parseJson(apiConfig?.heConfigJson);
  const redirects = redirectMeta(heConfig);
  const headerPhone = normalizePhone(input.phone || input.hint || '');

  if (provider === 'none') {
    return { phone: '', provider, error: null, ...redirects };
  }

  if (provider === 'header' || !provider) {
    return {
      phone: headerPhone,
      provider: 'header',
      error: null,
      ...redirects,
    };
  }

  // Prefer gateway header for non-API providers only.
  const apiHe =
    provider === 'safaricom_masked' ||
    provider === 'custom_http' ||
    provider === 'custom';

  if (headerPhone && !apiHe) {
    return {
      phone: headerPhone,
      provider,
      error: null,
      source: 'header',
      ...redirects,
    };
  }

  try {
    if (provider === 'safaricom_masked') {
      const result = await resolveSafaricomMasked(heConfig, input);
      return applySafaricomDummyFallback({
        ...result,
        provider,
        ...redirects,
      });
    }
    if (provider === 'custom_http' || provider === 'custom') {
      const result = await resolveCustomHttp(apiConfig, heConfig, input);
      return { ...result, provider, ...redirects };
    }
    return {
      phone: '',
      provider,
      error: `Unknown heProvider: ${provider}`,
      ...redirects,
    };
  } catch (err) {
    console.warn(`HE resolve failed (${provider}): ${err.message}`);
    const failed = {
      phone: '',
      provider,
      error: heConfig.failMessage || err.message,
      ...redirects,
    };
    return provider === 'safaricom_masked'
      ? applySafaricomDummyFallback(failed)
      : failed;
  }
};
