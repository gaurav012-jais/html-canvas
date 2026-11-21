import { maskPhone } from '../helpers/postback-register.js';
import { resolveRangeBounds } from '../../../common/zoned-day.js';

/**
 * Shared User Scope, Authorization, and DTO Serialization for Postback Queries.
 */
export function createPostbackScope(deps) {
  const { getCampaignRepo, getVendorRepo } = deps;

  const resolveUserScope = async (userId) => {
    const [campaigns, vendors] = await Promise.all([
      getCampaignRepo().find({
        where: { userId },
        relations: { marketOperator: { country: true } },
      }),
      getVendorRepo().find({
        where: { userId },
        select: ['id', 'name', 'code'],
      }),
    ]);
    return {
      campaignIds: campaigns.map((c) => c.id),
      vendorIds: vendors.map((v) => v.id),
      campaigns,
      vendors,
    };
  };

  const assertPostbackAccess = async (row, userId) => {
    const { campaignIds, vendorIds } = await resolveUserScope(userId);
    const okCampaign =
      row.campaignId && campaignIds.includes(Number(row.campaignId));
    const okVendor = row.vendorId && vendorIds.includes(Number(row.vendorId));
    if (!okCampaign && !okVendor) {
      const err = new Error('Postback not found');
      err.statusCode = 404;
      throw err;
    }
  };

  const serializePostback = (row, vendorMap = {}, campaignMap = {}) => {
    const vendor = row.vendorId ? vendorMap[row.vendorId] : null;
    const campaign = row.campaignId ? campaignMap[row.campaignId] : null;
    return {
      id: row.id,
      msisdn: maskPhone(row.msisdn),
      status: row.status,
      operatorStatus: row.operatorStatus || null,
      clickId: row.clickId,
      rcid: row.rcid,
      campid: row.campid,
      trackingCampid: row.trackingCampid,
      campaignId: row.campaignId,
      campaignName: campaign?.name || null,
      campaignTrackingId: campaign?.trackingId || null,
      vendorId: row.vendorId,
      vendorName: vendor?.name || null,
      vendorCode: vendor?.code || null,
      visitId: row.visitId,
      offerCode: row.offerCode,
      postbackUrl: row.postbackUrl,
      httpStatus: row.httpStatus,
      responseBody: row.responseBody,
      errorMessage: row.errorMessage,
      sentAt: row.sentAt,
      delayedChecksubStatus: row.delayedChecksubStatus || null,
      delayedChecksubScheduledAt: row.delayedChecksubScheduledAt || null,
      delayedChecksubExecutedAt: row.delayedChecksubExecutedAt || null,
      delayedChecksubOutcome: row.delayedChecksubOutcome || null,
      delayedChecksubResponse: row.delayedChecksubResponse || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  };

  const applyCreatedAtRange = (qb, alias, query = {}) => {
    const { from, to } = resolveRangeBounds({
      from: query.from,
      to: query.to,
      timezone: query.timezone,
    });
    if (from) qb.andWhere(`${alias}.createdAt >= :from`, { from });
    if (to) qb.andWhere(`${alias}.createdAt <= :to`, { to });
    return { from, to };
  };

  const applyUserScope = (qb, alias, campaignIds, vendorIds) => {
    if (campaignIds.length && vendorIds.length) {
      qb.andWhere(
        `(${alias}.campaignId IN (:...campaignIds) OR ${alias}.vendorId IN (:...vendorIds))`,
        { campaignIds, vendorIds },
      );
    } else if (campaignIds.length) {
      qb.andWhere(`${alias}.campaignId IN (:...campaignIds)`, { campaignIds });
    } else {
      qb.andWhere(`${alias}.vendorId IN (:...vendorIds)`, { vendorIds });
    }
  };

  return {
    resolveUserScope,
    assertPostbackAccess,
    serializePostback,
    applyCreatedAtRange,
    applyUserScope,
  };
}
