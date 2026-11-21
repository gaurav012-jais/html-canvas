import { In } from 'typeorm';
import { ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';

export function createPostbackListQuery(deps, scope) {
  const { getPostbackRepo, getVendorRepo, getCampaignRepo } = deps;
  const { resolveUserScope, serializePostback, applyCreatedAtRange } = scope;

  const listPostbacks = async (userId, query = {}) => {
    const { campaignIds, vendorIds, campaigns, vendors } =
      await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return { total: 0, page: 1, limit: 25, items: [] };
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
    const status = String(query.status || '')
      .trim()
      .toLowerCase();
    const operatorStatus = String(query.operatorStatus || '')
      .trim()
      .toLowerCase();
    const q = String(query.q || '').trim();
    const vendorIdFilter = query.vendorId ? parseInt(query.vendorId, 10) : null;
    const campaignIdFilter = query.campaignId
      ? parseInt(query.campaignId, 10)
      : null;
    const offerCodeFilter = String(query.offerCode || '').trim();

    const qb = getPostbackRepo().createQueryBuilder('p');
    if (campaignIds.length && vendorIds.length) {
      qb.where(
        '(p.campaignId IN (:...campaignIds) OR p.vendorId IN (:...vendorIds))',
        { campaignIds, vendorIds },
      );
    } else if (campaignIds.length) {
      qb.where('p.campaignId IN (:...campaignIds)', { campaignIds });
    } else {
      qb.where('p.vendorId IN (:...vendorIds)', { vendorIds });
    }

    if (status && Object.values(ConversionPostbackStatus).includes(status)) {
      qb.andWhere('p.status = :status', { status });
    }
    if (operatorStatus) {
      qb.andWhere('LOWER(p.operatorStatus) = :operatorStatus', {
        operatorStatus,
      });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      qb.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (campaignIdFilter && !Number.isNaN(campaignIdFilter)) {
      qb.andWhere('p.campaignId = :campaignIdFilter', { campaignIdFilter });
    }
    if (offerCodeFilter) {
      qb.andWhere('p.offerCode = :offerCodeFilter', { offerCodeFilter });
    }
    if (q) {
      const like = `%${q}%`;
      qb.andWhere(
        '(p.msisdn LIKE :like OR p.clickId LIKE :like OR p.rcid LIKE :like OR p.campid LIKE :like OR p.trackingCampid LIKE :like OR p.offerCode LIKE :like)',
        { like },
      );
    }
    applyCreatedAtRange(qb, 'p', query);

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy('p.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
    // Load any referenced vendors not in user's vendor list (edge)
    const missingVids = [
      ...new Set(
        rows.map((r) => r.vendorId).filter((id) => id && !vendorMap[id]),
      ),
    ];
    if (missingVids.length) {
      const extra = await getVendorRepo().find({
        where: { id: In(missingVids) },
      });
      for (const v of extra) vendorMap[v.id] = v;
    }

    const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
    const missingCids = [
      ...new Set(
        rows.map((r) => r.campaignId).filter((id) => id && !campaignMap[id]),
      ),
    ];
    if (missingCids.length) {
      const extra = await getCampaignRepo().find({
        where: { id: In(missingCids) },
        select: ['id', 'name', 'country', 'operator'],
      });
      for (const c of extra) campaignMap[c.id] = c;
    }

    return {
      total,
      page,
      limit,
      items: rows.map((r) => serializePostback(r, vendorMap, campaignMap)),
    };
  };

  return { listPostbacks };
}
