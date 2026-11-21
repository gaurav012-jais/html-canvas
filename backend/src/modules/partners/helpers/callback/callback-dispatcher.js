import { ConversionPostbackStatus } from '../../../../database/entities/conversion-postback.entity.js';
import { describeVendorFireDecision, parseOperatorStatus } from '../operator-callback-status.js';
import {
  parseCallbackClickId,
  parseCallbackMsisdn,
} from './callback-parser.js';
import { resolveAllowedStatuses } from './callback-status.js';
import { createCallbackLogger } from './callback-logger.js';

export const createCallbackDispatcher = (deps) => {
  const {
    getPostbackRepo,
    getVisitRepo,
    logApiCall,
    registerPending,
    firePostback,
    logEvent,
    setVisitPhone,
  } = deps;

  const processOperatorCallbackInner = async (query = {}) => {
    const incomingMsisdn = parseCallbackMsisdn(query);
    const clickId = parseCallbackClickId(query);
    const status = parseOperatorStatus(query);

    const { logInbound, reject } = createCallbackLogger({
      logEvent,
      logApiCall,
      query,
      status,
      clickId,
      incomingMsisdn,
    });

    const findLatestByMsisdn = async (msisdn) => {
      if (!msisdn) return null;
      return getPostbackRepo().findOne({
        where: { msisdn },
        order: { id: 'DESC' },
      });
    };

    const findVisitByClickId = async (cid) => {
      if (!cid) return null;
      return getVisitRepo()
        .createQueryBuilder('v')
        .where('v.click_id = :clickId', { clickId: cid })
        .orderBy('v.id', 'DESC')
        .getOne();
    };

    const findVisitByPhone = async (msisdn) => {
      if (!msisdn) return null;
      return getVisitRepo()
        .createQueryBuilder('v')
        .where('v.phone = :msisdn', { msisdn })
        .andWhere('(v.rcid IS NOT NULL OR v.click_id IS NOT NULL)')
        .orderBy('v.id', 'DESC')
        .getOne();
    };

    if (!incomingMsisdn && !clickId) {
      return reject('msisdn or click_id required');
    }

    const firePending = async (pending, extra = {}) => {
      const allowedStatuses = await resolveAllowedStatuses(
        deps,
        pending.campaignId,
        pending.vendorId,
      );
      const decision = describeVendorFireDecision(status, allowedStatuses);
      const fireVendor = decision.shouldFire;
      pending.operatorStatus = status;
      if (
        fireVendor &&
        pending.status !== ConversionPostbackStatus.SENT &&
        pending.status !== ConversionPostbackStatus.RECEIVED
      ) {
        pending.status = ConversionPostbackStatus.RECEIVED;
      }
      await getPostbackRepo().save(pending);
      const fireMeta = {
        operatorStatus: status,
        receivedStatus: decision.received,
        allowedStatuses: decision.allowedLabel,
        info: decision.info,
        vendorFired: fireVendor,
        postbackId: pending.id,
        vendorId: pending.vendorId,
        campid: pending.campid,
        trackingCampid: pending.trackingCampid,
      };
      if (!fireVendor) {
        await logInbound(
          pending.visitId,
          pending.campaignId,
          pending.clickId,
          pending.rcid,
          pending.msisdn,
          {
            ...extra,
            ...fireMeta,
            action: 'hold',
            reason: decision.info,
          },
        );
        return {
          success: true,
          id: pending.id,
          vendorFired: false,
          operatorStatus: status,
          status: pending.status,
          reason: decision.info,
        };
      }
      await logInbound(
        pending.visitId,
        pending.campaignId,
        pending.clickId,
        pending.rcid,
        pending.msisdn,
        {
          ...extra,
          ...fireMeta,
          action: 'fire',
        },
      );
      const fired = await firePostback(pending.id);
      return { ...fired, vendorFired: true, operatorStatus: status };
    };

    const registerAndFireFromVisit = async (visit, msisdn, extra = {}) => {
      const allowedStatuses = await resolveAllowedStatuses(
        deps,
        visit.campaignId,
        visit.vendorId,
      );
      const decision = describeVendorFireDecision(status, allowedStatuses);
      const fireVendor = decision.shouldFire;
      const digits = String(msisdn || '').replace(/\D/g, '') || '';
      const visitPhone = String(visit.phone || '').replace(/\D/g, '');
      if (visit.id && digits && !visitPhone) {
        await setVisitPhone(visit.id, digits).catch(() => {});
      }

      await logInbound(
        visit.id,
        visit.campaignId,
        visit.clickId || clickId,
        visit.rcid,
        digits || visitPhone || null,
        {
          ...extra,
          matchPath: extra.reason || null,
          vendorFired: fireVendor,
          operatorStatus: status,
          receivedStatus: decision.received,
          allowedStatuses: decision.allowedLabel,
          info: decision.info,
          vendorId: visit.vendorId,
          reason: fireVendor ? extra.reason : decision.info,
        },
      );

      const registered = await registerPending({
        visitId: visit.id,
        msisdn: digits || null,
        campaignId: visit.campaignId,
        vendorId: visit.vendorId,
        affiliateId: null,
        clickId: visit.clickId || clickId || null,
        rcid: visit.rcid,
        campid: visit.campid || '',
        trackingCampid: visit.trackingCampid || '',
        keepIfSent: true,
        asReceived: fireVendor,
        operatorStatus: status,
      });
      if (registered.skipped && !registered.id) {
        return { success: false, ...registered, operatorStatus: status };
      }
      const id = registered.id;
      if (!id) {
        return {
          success: false,
          skipped: true,
          reason: 'No pending callback',
          operatorStatus: status,
        };
      }
      if (!fireVendor) {
        return {
          success: true,
          id,
          vendorFired: false,
          operatorStatus: status,
          status: registered.status,
          reason: decision.info,
        };
      }
      const fired = await firePostback(id);
      return { ...fired, vendorFired: true, operatorStatus: status };
    };

    // click_id present: recover if that click exists here (MSISDN optional).
    if (clickId) {
      const visit = await findVisitByClickId(clickId);
      if (visit) {
        const phone =
          incomingMsisdn || String(visit.phone || '').replace(/\D/g, '') || '';
        return registerAndFireFromVisit(visit, phone, {
          action: 'register_then_fire',
          reason: incomingMsisdn
            ? 'click_id + msisdn — visit by click_id'
            : phone
              ? 'click_id only — msisdn from visit'
              : 'click_id only — stored without msisdn',
          campid: visit.campid,
          trackingCampid: visit.trackingCampid,
        });
      }
      if (!incomingMsisdn) {
        return reject('No visit for click_id');
      }
    }

    // msisdn present (alone, or unknown click_id): recover if number is in system.
    if (incomingMsisdn) {
      const pending = await findLatestByMsisdn(incomingMsisdn);
      if (pending) {
        return firePending(pending);
      }

      const visitByPhone = await findVisitByPhone(incomingMsisdn);
      if (visitByPhone) {
        return registerAndFireFromVisit(visitByPhone, incomingMsisdn, {
          action: 'register_then_fire',
          reason: 'no pending row — registered from latest visit',
          campid: visitByPhone.campid,
          trackingCampid: visitByPhone.trackingCampid,
        });
      }

      return reject(
        clickId
          ? 'No visit for click_id and msisdn not in system'
          : 'msisdn not in system',
      );
    }

    return reject('No pending callback');
  };

  return { processOperatorCallbackInner };
};
