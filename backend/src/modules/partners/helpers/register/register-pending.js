import { ConversionPostbackStatus } from '../../../../database/entities/conversion-postback.entity.js';
import { VisitEventType } from '../../../../database/entities/visit-event.entity.js';
import { analyticsService } from '../../../analytics/analytics.service.js';
import { affiliateRcidFromVisit } from '../postback-template.js';
import { maybeScheduleDelayedChecksub } from './register-delayed-checksub.js';

export const createRegisterPending = ({
  getPostbackRepo,
  getVisitRepo,
  resolvePostbackTemplate,
  resolveVendorFromCampaign,
  indexPostbackEvent,
  firePostback,
}) => {
  return async (input) => {
    const msisdn =
      String(input.msisdn || input.phone || '').replace(/\D/g, '') || null;
    let vendorId = input.vendorId || null;
    let clickId = input.clickId || '';
    if (!msisdn && !String(clickId || '').trim() && !input.visitId) {
      return { skipped: true, reason: 'missing msisdn or click_id' };
    }
    let rcid = input.rcid || '';
    let campid = String(input.campid || '').trim();
    let trackingCampid = String(
      input.trackingCampid || input.tracking_campid || '',
    ).trim();
    let visitId = input.visitId || null;
    let campaignId = input.campaignId || null;

    if (
      visitId &&
      (!vendorId ||
        !clickId ||
        !rcid ||
        !campid ||
        !trackingCampid ||
        !campaignId)
    ) {
      const visit = await getVisitRepo().findOne({
        where: { id: parseInt(visitId, 10) },
      });
      if (visit) {
        vendorId = vendorId || visit.vendorId || null;
        clickId = clickId || visit.clickId || '';
        rcid = rcid || affiliateRcidFromVisit(visit) || '';
        campaignId = campaignId || visit.campaignId || null;
        if (!campid && visit.campid) campid = String(visit.campid);
        if (!trackingCampid && visit.trackingCampid) {
          trackingCampid = String(visit.trackingCampid);
        }
      }
    }

    // Legacy rows: if only one id was stored as click_id, treat as rcid for network.
    if (!rcid && clickId && input.legacyClickAsRcid) {
      rcid = clickId;
    }

    let { template, vendorId: resolvedVendorId } =
      await resolvePostbackTemplate(vendorId);
    vendorId = resolvedVendorId || vendorId;

    if (!template && !vendorId) {
      const fromCampaign = await resolveVendorFromCampaign(campaignId);
      if (fromCampaign.vendorId) vendorId = fromCampaign.vendorId;
      if (fromCampaign.template) template = fromCampaign.template;
    }

    if (!template) {
      console.warn(
        `[postback] queueing pending without postback_url (msisdn=${msisdn || 'none'}, clickId=${clickId || 'none'}, vendorId=${vendorId || 'none'}, campaignId=${campaignId || 'none'})`,
      );
    }

    if (!msisdn && !String(clickId || '').trim()) {
      return { skipped: true, reason: 'missing msisdn or click_id' };
    }

    const findExisting = async () => {
      const cid = String(clickId || '').trim();
      if (cid) {
        const byClick = await getPostbackRepo()
          .createQueryBuilder('p')
          .where('p.clickId = :clickId', { clickId: cid })
          .orderBy('p.id', 'DESC')
          .take(1)
          .getOne();
        if (byClick) return byClick;
      }
      if (msisdn) {
        return getPostbackRepo()
          .createQueryBuilder('p')
          .where('p.msisdn = :msisdn', { msisdn })
          .orderBy('p.id', 'DESC')
          .take(1)
          .getOne();
      }
      return null;
    };

    const existing = await findExisting();

    const parsedVisitId = visitId ? parseInt(visitId, 10) : null;
    const savedTemplate = template || null;
    const keepIfSent = Boolean(input.keepIfSent);
    const forceFire = Boolean(input.forceFire || input.force);
    const alreadySent = existing?.status === ConversionPostbackStatus.SENT;
    const nextStatus = input.asReceived
      ? ConversionPostbackStatus.RECEIVED
      : ConversionPostbackStatus.PENDING;

    if (existing) {
      existing.clickId = clickId || existing.clickId || null;
      existing.rcid = rcid || existing.rcid || null;
      existing.campid = campid || existing.campid || null;
      if (msisdn) existing.msisdn = msisdn;
      if (trackingCampid) existing.trackingCampid = trackingCampid;
      if (parsedVisitId) existing.visitId = parsedVisitId;
      if (campaignId) existing.campaignId = campaignId;
      if (vendorId) existing.vendorId = vendorId;
      if (savedTemplate) existing.postbackUrl = savedTemplate;
      if (!(keepIfSent && alreadySent) || forceFire) {
        existing.status = nextStatus;
        existing.httpStatus = null;
        existing.responseBody = null;
        existing.errorMessage = null;
        existing.sentAt = null;
      }
      if (input.offerCode) existing.offerCode = input.offerCode;
      if (input.operatorStatus) {
        existing.operatorStatus = String(input.operatorStatus).slice(0, 64);
      }

      const row = await getPostbackRepo().save(existing);

      if (!input.asReceived) {
        if (parsedVisitId) {
          await analyticsService.logEvent(
            parsedVisitId,
            VisitEventType.POSTBACK_PENDING,
            {
              info: 'Vendor CPA postback updated (msisdn upsert) — waiting for billing callback.',
              postbackId: row.id,
              updated: true,
              rcid: row.rcid,
              clickId: row.clickId,
              campid: row.campid,
              trackingCampid: row.trackingCampid,
              postbackUrl: row.postbackUrl,
            },
          );
        } else {
          await indexPostbackEvent(row, 'POSTBACK_PENDING', { updated: true });
        }
      }

      void maybeScheduleDelayedChecksub(row);

      if (input.fireImmediate) {
        return firePostback(row.id, { force: forceFire });
      }

      return { success: true, id: row.id, status: row.status, updated: true };
    }

    const row = await getPostbackRepo().save(
      getPostbackRepo().create({
        visitId: parsedVisitId,
        campaignId: campaignId || null,
        vendorId: vendorId || null,
        affiliateId: null,
        msisdn: msisdn || null,
        campid: campid || null,
        trackingCampid: trackingCampid || null,
        clickId: clickId || null,
        rcid: rcid || null,
        offerCode: input.offerCode || null,
        postbackUrl: savedTemplate,
        status: nextStatus,
        operatorStatus: input.operatorStatus
          ? String(input.operatorStatus).slice(0, 64)
          : null,
      }),
    );

    if (!input.asReceived) {
      if (parsedVisitId) {
        await analyticsService.logEvent(
          parsedVisitId,
          VisitEventType.POSTBACK_PENDING,
          {
            info: 'Vendor CPA postback queued — waiting for billing callback.',
            postbackId: row.id,
            rcid: row.rcid,
            clickId: row.clickId,
            campid: row.campid,
            trackingCampid: row.trackingCampid,
            postbackUrl: row.postbackUrl,
          },
        );
      } else {
        await indexPostbackEvent(row, 'POSTBACK_PENDING');
      }
    }

    void maybeScheduleDelayedChecksub(row);

    if (input.fireImmediate) {
      return firePostback(row.id, { force: forceFire });
    }

    return { success: true, id: row.id, status: row.status };
  };
};
