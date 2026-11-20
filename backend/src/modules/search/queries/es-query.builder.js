import { resolveRangeBounds } from '../../../common/zoned-day.js';

export const escapeWildcard = (value) => {
  return value.replace(/([\\*?])/g, '\\$1');
};

export const maskPhone = (phone) => {
  if (!phone) return undefined;
  return String(phone).trim();
};

export const buildQuery = (params) => {
  const filter = [];
  if (params.campaignId !== undefined) {
    if (Array.isArray(params.campaignId)) {
      if (params.campaignId.length > 0) {
        filter.push({ terms: { campaignId: params.campaignId } });
      } else {
        filter.push({ terms: { campaignId: [-1] } });
      }
    } else {
      filter.push({ term: { campaignId: params.campaignId } });
    }
  }
  if (params.visitId !== undefined) {
    filter.push({ term: { visitId: params.visitId } });
  }
  if (params.eventType) filter.push({ term: { eventType: params.eventType } });
  if (params.status) filter.push({ term: { status: params.status } });
  if (params.vendorId) filter.push({ term: { vendorId: params.vendorId } });
  if (params.affiliateId)
    filter.push({ term: { affiliateId: params.affiliateId } });
  if (params.clickId) filter.push({ term: { clickId: params.clickId } });
  if (params.rcid) filter.push({ term: { rcid: params.rcid } });
  if (params.from || params.to) {
    const { from, to } = resolveRangeBounds(params);
    const range = {};
    if (from) range.gte = from.toISOString();
    if (to) range.lte = to.toISOString();
    filter.push({ range: { timestamp: range } });
  }
  const must = [];
  if (params.q) {
    const escaped = escapeWildcard(params.q);
    const keywordFields = [
      'clickId',
      'rcid',
      'vidRaw',
      'affRaw',
      'phoneMasked',
      'phone',
      'ip',
    ];
    must.push({
      bool: {
        should: [
          { match_phrase_prefix: { userAgent: params.q } },
          ...keywordFields.map((field) => ({
            wildcard: {
              [field]: {
                value: `*${escaped}*`,
                case_insensitive: true,
              },
            },
          })),
        ],
        minimum_should_match: 1,
      },
    });
  }
  return { bool: { filter, must } };
};
