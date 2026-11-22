import { asyncHandler } from '../../../common/middleware/asyncHandler.js';
import { resolveCampidParams } from '../helpers/request.util.js';
import { universeDcbService } from '../universe-dcb.service.js';
import { universeDcbExposeService } from '../universe-dcb-expose.service.js';
import { orangeBfExposeService } from '../orange-bf-expose.service.js';

export const dcbInput = (req, dcbSource) => {
  const values = { ...(req.query || {}), ...(req.body || {}) };
  const camp = resolveCampidParams(values);
  return {
    country: values.country,
    operator: values.operator,
    campid: camp.campid,
    trackingCampid: camp.trackingCampid,
    msisdn: values.msisdn || values.phone,
    serviceId: values.serviceId || values.service_id,
    purchaseTypeId: values.purchaseTypeId || values.purchase_type_id,
    transactionChannel: values.transactionChannel || values.transaction_channel,
    visitId: values.visitId || values.visit_id,
    pin: values.pin || values.pincode,
    dcbSource,
  };
};

export const flowDcbActions = {
  dcbConfig: asyncHandler(async (req, res) => {
    res.json(await universeDcbService.getPublicConfig(dcbInput(req, 'config')));
  }),

  dcbManualCheck: asyncHandler(async (req, res) => {
    res.json(
      await universeDcbService.manualCheck(dcbInput(req, 'manual-check')),
    );
  }),

  dcbPincode: asyncHandler(async (req, res) => {
    res.json(
      await universeDcbService.requestPincode(dcbInput(req, 'pincode')),
    );
  }),

  dcbConfirm: asyncHandler(async (req, res) => {
    res.json(await universeDcbService.confirm(dcbInput(req, 'confirm')));
  }),

  dcbStatus: asyncHandler(async (req, res) => {
    res.json(await universeDcbService.status(dcbInput(req, 'poll')));
  }),

  dcbExposeConfig: asyncHandler(async (req, res) => {
    const data = await universeDcbExposeService.exposeConfig(
      {
        campaignId: req.params.campaignId,
        vendorId: req.params.vendorId,
      },
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      {
        requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      },
    );
    res.json(data);
  }),

  dcbExposePincode: asyncHandler(async (req, res) => {
    const values = { ...(req.query || {}), ...(req.body || {}) };
    const data = await universeDcbExposeService.exposePincode(
      {
        campaignId: req.params.campaignId,
        vendorId: req.params.vendorId,
        msisdn: values.msisdn || values.phone,
        purchaseTypeId: values.purchaseTypeId || values.purchase_type_id,
        pack: values.pack || values.packKey || values.pack_key,
        transactionChannel:
          values.transactionChannel || values.transaction_channel || 'Wifi',
        serviceId: values.serviceId || values.service_id,
      },
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      {
        requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      },
    );
    res.json(data);
  }),

  dcbExposeConfirm: asyncHandler(async (req, res) => {
    const values = { ...(req.query || {}), ...(req.body || {}) };
    const data = await universeDcbExposeService.exposeConfirm(
      {
        campaignId: req.params.campaignId,
        vendorId: req.params.vendorId,
        msisdn: values.msisdn || values.phone,
        purchaseTypeId: values.purchaseTypeId || values.purchase_type_id,
        transactionChannel:
          values.transactionChannel || values.transaction_channel || 'Wifi',
        serviceId: values.serviceId || values.service_id,
        pin: values.pin || values.pincode || values.pinCode || values.otp,
        requestId: values.requestId || values.request_id || values.id,
      },
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      {
        requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      },
    );
    res.json(data);
  }),

  dcbExposeStatus: asyncHandler(async (req, res) => {
    const values = { ...(req.query || {}), ...(req.body || {}) };
    const data = await universeDcbExposeService.exposeStatus(
      {
        campaignId: req.params.campaignId,
        vendorId: req.params.vendorId,
        msisdn: values.msisdn || values.phone,
        serviceId: values.serviceId || values.service_id,
        purchaseTypeId: values.purchaseTypeId || values.purchase_type_id,
        transactionChannel:
          values.transactionChannel || values.transaction_channel || 'Wifi',
      },
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      {
        requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      },
    );
    res.json(data);
  }),

  dcbExposeScreen: asyncHandler(async (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const html = await universeDcbExposeService.exposeScreen({
      campaignId: req.params.campaignId,
      vendorId: req.params.vendorId,
      origin,
      absolute:
        req.query?.absolute === '1' ||
        String(req.query?.absolute || '').toLowerCase() === 'true',
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  }),

  orangeBfCheck: asyncHandler(async (req, res) => {
    return orangeBfExposeService.handleCheckSub(req, res);
  }),

  orangeBfSendOtp: asyncHandler(async (req, res) => {
    return orangeBfExposeService.handleSendOtp(req, res);
  }),

  orangeBfVerifyOtp: asyncHandler(async (req, res) => {
    return orangeBfExposeService.handleVerifyOtp(req, res);
  }),

  orangeBfUnsub: asyncHandler(async (req, res) => {
    return orangeBfExposeService.handleUnsubscribe(req, res);
  }),
};
