import { EntitySchema } from 'typeorm';

/**
 * ApiCallLog Entity Model
 *
 * Comprehensive immutable audit log of every inbound or outbound HTTP request
 * handled by the platform (carrier billing callbacks, vendor postbacks, OTP provider requests,
 * HE resolution, DCB gateway calls).
 * Logs:
 * - Telco carrier integration calls (CheckSub, Subscribe, OTP Send/Verify, DCB Pincode/Confirm)
 * - Inbound carrier billing callbacks and asynchronous notifications
 * - Outbound server-to-server (S2S) vendor postbacks
 * - Request payloads, response status codes, timing, and error details
 *
 * @class ApiCallLog
 */
export class ApiCallLog {}

/**
 * Category of HTTP API call being audited.
 *
 * @readonly
 * @enum {string}
 */
export const ApiCallType = {
  /** Carrier subscription status inquiry */
  CHECKSUB: 'checksub',
  /** Direct subscription opt-in invocation */
  SUBSCRIBE: 'subscribe',
  /** DND / blocklist validation lookup */
  BLOCKLIST: 'blocklist',
  /** Token-to-MSISDN network resolution */
  RESOLVE_MSISDN: 'resolve_msisdn',
  /** Priority routing check */
  PRIORITY: 'priority',
  /** Outbound OTP SMS PIN dispatch */
  OTP_SEND: 'otp_send',
  /** Outbound OTP PIN verification check */
  OTP_VERIFY: 'otp_verify',
  /** Inbound exposed OTP send request from partner */
  OTP_EXPOSE_SEND_IN: 'otp_expose_send_in',
  /** Inbound exposed OTP verify request from partner */
  OTP_EXPOSE_VERIFY_IN: 'otp_expose_verify_in',
  /** Header enrichment token extraction */
  HE_TOKEN: 'he_token',
  /** Header enrichment direct MSISDN extraction */
  HE_MSISDN: 'he_msisdn',
  /** Header enrichment resolution */
  HE_RESOLVE: 'he_resolve',
  /** Header enrichment gateway redirect */
  HE_REDIRECT: 'he_redirect',
  /** Consent gateway redirect */
  CG_REDIRECT: 'cg_redirect',
  /** DCB provider configuration retrieval */
  DCB_CONFIG: 'dcb_config',
  /** DCB subscription status check */
  DCB_SUBSCRIPTIONS: 'dcb_subscriptions',
  /** DCB PIN generation request */
  DCB_PINCODE: 'dcb_pincode',
  /** DCB PIN confirmation / charging request */
  DCB_CONFIRM: 'dcb_confirm',
  /** Inbound exposed DCB configuration request */
  DCB_EXPOSE_CONFIG_IN: 'dcb_expose_config_in',
  /** Inbound exposed DCB pincode request */
  DCB_EXPOSE_PINCODE_IN: 'dcb_expose_pincode_in',
  /** Inbound exposed DCB confirm request */
  DCB_EXPOSE_CONFIRM_IN: 'dcb_expose_confirm_in',
  /** Inbound exposed DCB status request */
  DCB_EXPOSE_STATUS_IN: 'dcb_expose_status_in',
  /** Orange Burkina Faso checksub call */
  ORANGE_BF_CHECKSUB: 'orange_bf_checksub',
  /** Orange Burkina Faso OTP send */
  ORANGE_BF_OTP_SEND: 'orange_bf_otp_send',
  /** Orange Burkina Faso OTP verify */
  ORANGE_BF_OTP_VERIFY: 'orange_bf_otp_verify',
  /** Orange Burkina Faso unsubscription */
  ORANGE_BF_UNSUB: 'orange_bf_unsub',
  /** Orange Burkina Faso data sync */
  ORANGE_BF_SYNC: 'orange_bf_sync',
  /** Inbound exposed Orange BF checksub */
  ORANGE_BF_EXPOSE_CHECK_IN: 'orange_bf_expose_check_in',
  /** Inbound exposed Orange BF OTP send */
  ORANGE_BF_EXPOSE_SEND_IN: 'orange_bf_expose_send_in',
  /** Inbound exposed Orange BF OTP verify */
  ORANGE_BF_EXPOSE_VERIFY_IN: 'orange_bf_expose_verify_in',
  /** Inbound exposed Orange BF unsubscription */
  ORANGE_BF_EXPOSE_UNSUB_IN: 'orange_bf_expose_unsub_in',
  /** Inbound carrier billing webhook callback */
  BILLING_CALLBACK: 'billing_callback',
  /** Outbound vendor conversion postback delivery */
  VENDOR_POSTBACK: 'vendor_postback',
};

/**
 * TypeORM Schema Definition for ApiCallLog
 * Maps to the `api_call_logs` table.
 */
export const ApiCallLogSchema = new EntitySchema({
  name: 'ApiCallLog',
  target: ApiCallLog,
  tableName: 'api_call_logs',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number|null} Foreign key referencing `visits.id` if request is correlated with a visit */
    visitId: {
      name: 'visit_id',
      type: 'int',
      nullable: true,
    },
    /** @type {number|null} Foreign key referencing `campaigns.id` */
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      nullable: true,
    },
    /** @type {string|null} MSISDN extracted from the request URL, query, or body */
    msisdn: {
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    /** @type {string|null} Affiliate original click identifier (?rcid=) */
    rcid: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    /** @type {string|null} Vendor click ID (?click_id=) extracted from request context */
    clickId: {
      name: 'click_id',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    /** @type {string} Classification category of the API call (see ApiCallType enum) */
    callType: {
      name: 'call_type',
      type: 'varchar',
      length: 32,
    },
    /** @type {string|null} Target URL or inbound endpoint URL */
    requestUrl: {
      name: 'request_url',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} Serialized request payload or query parameters JSON */
    requestBody: {
      name: 'request_body',
      type: 'text',
      nullable: true,
    },
    /** @type {number|null} HTTP response status code (e.g. 200, 400, 500) */
    responseStatus: {
      name: 'response_status',
      type: 'int',
      nullable: true,
    },
    /** @type {string|null} Serialized response body text returned by the remote endpoint */
    responseBody: {
      name: 'response_body',
      type: 'text',
      nullable: true,
    },
    /** @type {boolean|null} True if invocation completed with a successful HTTP status code (2xx) */
    success: {
      type: 'boolean',
      nullable: true,
    },
    /** @type {string|null} Error description or exception stack trace if call failed */
    errorMessage: {
      name: 'error_message',
      type: 'text',
      nullable: true,
    },
    /** @type {Date} Record creation timestamp */
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  indices: [
    { name: 'IDX_api_call_logs_msisdn', columns: ['msisdn'] },
    { name: 'IDX_api_call_logs_rcid', columns: ['rcid'] },
    { name: 'IDX_api_call_logs_click_id', columns: ['clickId'] },
    { name: 'IDX_api_call_logs_visit_id', columns: ['visitId'] },
  ],
});
