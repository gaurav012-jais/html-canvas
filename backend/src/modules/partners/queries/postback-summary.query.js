import { ConversionPostbackStatus } from '../../../database/entities/conversion-postback.entity.js';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import { daysAgo } from '../helpers/postback-register.js';
import { resolveRangeBounds } from '../../../common/zoned-day.js';

export function createPostbackSummaryQuery(deps, scope) {
  const {
    getPostbackRepo,
    getVisitRepo,
    getApiCallLogRepo,
  } = deps;
  const { resolveUserScope } = scope;

  const emptySummary = () => ({
    msisdnResolved: 0,
    postbacksCreated: 0,
    pending: 0,
    received: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    heFailCg: 0,
    callbacksReceived: 0,
    byOperatorStatus: [],
    byVendor: [],
    since: daysAgo(30).toISOString(),
  });

  const getSummary = async (userId, query = {}) => {
    const { campaignIds, vendorIds, vendors, campaigns } =
      await resolveUserScope(userId);
    if (!campaignIds.length && !vendorIds.length) {
      return emptySummary();
    }

    const countryFilter = String(query.country || '')
      .trim()
      .toUpperCase();
    const operatorFilter = String(query.operator || '')
      .trim()
      .toLowerCase();
    const campaignIdFilter = query.campaignId
      ? parseInt(query.campaignId, 10)
      : null;
    const vendorIdFilter = query.vendorId ? parseInt(query.vendorId, 10) : null;
    const offerCodeFilter = String(query.offerCode || '').trim();

    let scopedCampaigns = campaigns;
    if (countryFilter) {
      scopedCampaigns = scopedCampaigns.filter(
        (c) =>
          String(c.country || '').toUpperCase() === countryFilter ||
          String(c.marketOperator?.country?.code || '').toUpperCase() ===
            countryFilter ||
          String(c.marketOperator?.country?.name || '').toUpperCase() ===
            countryFilter,
      );
    }
    if (operatorFilter) {
      scopedCampaigns = scopedCampaigns.filter(
        (c) =>
          String(c.operator || '').toLowerCase() === operatorFilter ||
          String(c.marketOperator?.code || '').toLowerCase() ===
            operatorFilter ||
          String(c.marketOperator?.name || '').toLowerCase() === operatorFilter,
      );
    }

    let scopedCampaignIds = scopedCampaigns.map((c) => c.id);
    if (campaignIdFilter && !Number.isNaN(campaignIdFilter)) {
      if (!scopedCampaignIds.includes(campaignIdFilter)) {
        return emptySummary();
      }
      scopedCampaignIds = [campaignIdFilter];
    }

    if (scopedCampaignIds.length === 0 && !vendorIds.length) {
      return emptySummary();
    }

    const days = Math.min(Math.max(Number(query.days) || 30, 1), 365);
    const hasExplicitRange = Boolean(query.from || query.to);
    const { from, to } = hasExplicitRange
      ? resolveRangeBounds({
          from: query.from,
          to: query.to,
          timezone: query.timezone,
        })
      : { from: daysAgo(days), to: undefined };
    const since = from || daysAgo(days);
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    let msisdnResolved = 0;
    let heFailCg = 0;
    if (scopedCampaignIds.length) {
      const visitQ = getVisitRepo()
        .createQueryBuilder('v')
        .where('v.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds })
        .andWhere('v.phone IS NOT NULL')
        .andWhere("v.phone <> ''")
        .andWhere('v.createdAt >= :since', { since });
      if (to) visitQ.andWhere('v.createdAt <= :until', { until: to });
      if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
        visitQ.andWhere('v.vendorId = :vendorIdFilter', { vendorIdFilter });
      }
      msisdnResolved = await visitQ.getCount();

      const failQ = getApiCallLogRepo()
        .createQueryBuilder('l')
        .where('l.campaignId IN (:...scopedCampaignIds)', { scopedCampaignIds })
        .andWhere('l.callType = :heRedirect', {
          heRedirect: ApiCallType.HE_REDIRECT,
        })
        .andWhere('l.success = :fail', { fail: false })
        .andWhere('l.createdAt >= :since', { since });
      if (to) failQ.andWhere('l.createdAt <= :until', { until: to });
      heFailCg = await failQ.getCount();
    }

    const pbQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.createdAt >= :since', { since });
    if (to) pbQ.andWhere('p.createdAt <= :until', { until: to });
    if (scopedCampaignIds.length && vendorIds.length) {
      pbQ.andWhere(
        '(p.campaignId IN (:...scopedCampaignIds) OR p.vendorId IN (:...vendorIds))',
        { scopedCampaignIds, vendorIds },
      );
    } else if (scopedCampaignIds.length) {
      pbQ.andWhere('p.campaignId IN (:...scopedCampaignIds)', {
        scopedCampaignIds,
      });
    } else {
      pbQ.andWhere('p.vendorId IN (:...vendorIds)', { vendorIds });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      pbQ.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (offerCodeFilter) {
      pbQ.andWhere('p.offerCode = :offerCodeFilter', { offerCodeFilter });
    }

    const rows = await pbQ
      .select('p.status', 'status')
      .addSelect('p.vendorId', 'vendorId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('p.status')
      .addGroupBy('p.vendorId')
      .getRawMany();

    let pending = 0;
    let received = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let postbacksCreated = 0;
    const byVendorAcc = {};

    for (const r of rows) {
      const cnt = Number(r.cnt) || 0;
      const status = String(r.status || '');
      const vid = r.vendorId != null ? Number(r.vendorId) : null;
      postbacksCreated += cnt;
      if (status === ConversionPostbackStatus.PENDING) pending += cnt;
      else if (status === ConversionPostbackStatus.RECEIVED) received += cnt;
      else if (status === ConversionPostbackStatus.SENT) sent += cnt;
      else if (status === ConversionPostbackStatus.FAILED) failed += cnt;
      else if (status === ConversionPostbackStatus.SKIPPED) skipped += cnt;

      const key = vid || 0;
      if (!byVendorAcc[key]) {
        const v = vid ? vendorMap[vid] : null;
        byVendorAcc[key] = {
          vendorId: vid,
          vendorName: v?.name || (vid ? `Vendor #${vid}` : 'Unknown'),
          vendorCode: v?.code || null,
          pending: 0,
          received: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          total: 0,
        };
      }
      byVendorAcc[key].total += cnt;
      if (status === ConversionPostbackStatus.PENDING)
        byVendorAcc[key].pending += cnt;
      else if (status === ConversionPostbackStatus.RECEIVED)
        byVendorAcc[key].received += cnt;
      else if (status === ConversionPostbackStatus.SENT)
        byVendorAcc[key].sent += cnt;
      else if (status === ConversionPostbackStatus.FAILED)
        byVendorAcc[key].failed += cnt;
      else if (status === ConversionPostbackStatus.SKIPPED)
        byVendorAcc[key].skipped += cnt;
    }

    const opQ = getPostbackRepo()
      .createQueryBuilder('p')
      .where('p.createdAt >= :since', { since })
      .andWhere('p.operatorStatus IS NOT NULL')
      .andWhere("p.operatorStatus <> ''");
    if (to) opQ.andWhere('p.createdAt <= :until', { until: to });
    if (scopedCampaignIds.length && vendorIds.length) {
      opQ.andWhere(
        '(p.campaignId IN (:...scopedCampaignIds) OR p.vendorId IN (:...vendorIds))',
        { scopedCampaignIds, vendorIds },
      );
    } else if (scopedCampaignIds.length) {
      opQ.andWhere('p.campaignId IN (:...scopedCampaignIds)', {
        scopedCampaignIds,
      });
    } else {
      opQ.andWhere('p.vendorId IN (:...vendorIds)', { vendorIds });
    }
    if (vendorIdFilter && !Number.isNaN(vendorIdFilter)) {
      opQ.andWhere('p.vendorId = :vendorIdFilter', { vendorIdFilter });
    }
    if (offerCodeFilter) {
      opQ.andWhere('p.offerCode = :offerCodeFilter', { offerCodeFilter });
    }
    const operatorRows = await opQ
      .select('LOWER(p.operatorStatus)', 'operatorStatus')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('LOWER(p.operatorStatus)')
      .getRawMany();
    const latestByOperatorStatus = operatorRows
      .map((r) => ({
        status: String(r.operatorStatus || 'unknown'),
        count: Number(r.cnt) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    let callbacksReceived = 0;
    let byOperatorStatus = latestByOperatorStatus;
    if (scopedCampaignIds.length) {
      try {
        const statusExpr = `LOWER(COALESCE(NULLIF((regexp_match(l.request_body, '"status"[[:space:]]*:[[:space:]]*"([^"]+)"'))[1], ''), 'unknown'))`;
        const cbQ = getApiCallLogRepo()
          .createQueryBuilder('l')
          .where('l.callType = :cbType', {
            cbType: ApiCallType.BILLING_CALLBACK,
          })
          .andWhere('l.campaignId IN (:...scopedCampaignIds)', {
            scopedCampaignIds,
          })
          .andWhere('l.createdAt >= :since', { since });
        if (to) cbQ.andWhere('l.createdAt <= :until', { until: to });
        const cbRows = await cbQ
          .select(statusExpr, 'operatorStatus')
          .addSelect('COUNT(*)', 'cnt')
          .groupBy(statusExpr)
          .getRawMany();
        const hits = [];
        for (const row of cbRows) {
          const count = Number(row.cnt) || 0;
          callbacksReceived += count;
          hits.push({
            status: String(row.operatorStatus || 'unknown'),
            count,
          });
        }
        hits.sort((a, b) => b.count - a.count);
        if (hits.length) byOperatorStatus = hits;
      } catch (err) {
        console.warn(
          `callback status aggregation failed: ${err?.message || err}`,
        );
        callbacksReceived = latestByOperatorStatus.reduce(
          (n, r) => n + r.count,
          0,
        );
      }
    } else {
      callbacksReceived = latestByOperatorStatus.reduce(
        (n, r) => n + r.count,
        0,
      );
    }

    return {
      msisdnResolved,
      heFailCg,
      postbacksCreated,
      pending,
      received,
      sent,
      failed,
      skipped,
      callbacksReceived,
      byOperatorStatus,
      byVendor: Object.values(byVendorAcc).sort((a, b) => b.total - a.total),
      since: since.toISOString(),
      until: to ? to.toISOString() : null,
    };
  };

  return { getSummary };
}
