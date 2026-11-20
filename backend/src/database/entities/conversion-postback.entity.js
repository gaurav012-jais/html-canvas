import { EntitySchema } from 'typeorm';

/**
 * ConversionPostback Entity Model
 *
 * Tracks the complete lifecycle of vendor and affiliate server-to-server (S2S) postbacks.
 * Created when a subscriber successfully confirms opt-in or completes payment on a campaign.
 * Handles deduplication by subscriber MSISDN, macro substitution, HTTP delivery attempts,
 * response logging, carrier callback status reconciliation, and 30-minute delayed checksub audits.
 *
 * @class ConversionPostback
 */
export class ConversionPostback {}

/**
 * Vendor Postback Delivery Status Enum.
 *
 * @readonly
 * @enum {string}
 */
export const ConversionPostbackStatus = {
  /** Postback queued and awaiting delivery to vendor endpoint */
  PENDING: 'pending',
  /** Postback received from billing callback but not yet forwarded */
  RECEIVED: 'received',
  /** Postback successfully delivered with 2xx HTTP response from vendor */
  SENT: 'sent',
  /** Postback failed delivery after exhausted HTTP retries */
  FAILED: 'failed',
  /** Postback skipped (e.g. payout percentage throttling or disallowed status) */
  SKIPPED: 'skipped',
  /** Postback held awaiting 30-minute carrier checksub verification */
  PENDING_CHECKSUB: 'pending_checksub',
};

/**
 * TypeORM Schema Definition for ConversionPostback
 * Maps to the `conversion_postbacks` table.
 */
export const ConversionPostbackSchema = new EntitySchema({
  name: 'ConversionPostback',
  target: ConversionPostback,
  tableName: 'conversion_postbacks',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number|null} Foreign key referencing originating `visits.id` */
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
    /** @type {number|null} Foreign key referencing `vendors.id` */
    vendorId: {
      name: 'vendor_id',
      type: 'int',
      nullable: true,
    },
    /** @type {number|null} Optional foreign key referencing `affiliates.id` */
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true,
    },
    /** @type {string|null} User phone number / MSISDN (unique per conversion) */
    msisdn: {
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    /** @type {string|null} Vendor or network campaign identifier passed in query (?campid=) */
    campid: {
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    /** @type {string|null} Internal tracking campaign code (e.g. BF-OBF-11) */
    trackingCampid: {
      name: 'tracking_campid',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    /** @type {string|null} Inbound vendor click ID (?click_id=) used for S2S payout match */
    clickId: {
      name: 'click_id',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    /** @type {string|null} Affiliate referrer/reverse click ID (?rcid=) */
    rcid: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    /** @type {string|null} External carrier offer code identifier */
    offerCode: {
      name: 'offer_code',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    /** @type {string|null} Fully resolved vendor postback URL with substituted macros */
    postbackUrl: {
      name: 'postback_url',
      type: 'text',
      nullable: true,
    },
    /** @type {string} Postback delivery status: 'pending' | 'received' | 'sent' | 'failed' | 'skipped' | 'pending_checksub' */
    status: {
      type: 'varchar',
      length: 32,
      default: ConversionPostbackStatus.PENDING,
    },
    /** @type {string|null} Latest operator / billing callback status ('active', 'grace', 'parking', 'unsub') */
    operatorStatus: {
      name: 'operator_status',
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    /** @type {number|null} HTTP response status code returned by vendor postback endpoint (e.g. 200) */
    httpStatus: {
      name: 'http_status',
      type: 'int',
      nullable: true,
    },
    /** @type {string|null} Response body text returned by vendor endpoint */
    responseBody: {
      name: 'response_body',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} Error description if HTTP request failed */
    errorMessage: {
      name: 'error_message',
      type: 'text',
      nullable: true,
    },
    /** @type {Date|null} Timestamp when postback was successfully delivered to vendor */
    sentAt: {
      name: 'sent_at',
      type: 'timestamp',
      nullable: true,
    },
    /** @type {Date} Record creation timestamp */
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    /** @type {Date} Record last update timestamp */
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
    /** @type {string|null} Delayed checksub worker processing status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' */
    delayedChecksubStatus: {
      name: 'delayed_checksub_status',
      type: 'varchar',
      length: 32,
      nullable: true,
    },
    /** @type {Date|null} Scheduled execution time for delayed audit (typically created_at + 30 minutes) */
    delayedChecksubScheduledAt: {
      name: 'delayed_checksub_scheduled_at',
      type: 'timestamp',
      nullable: true,
    },
    /** @type {Date|null} Actual timestamp when delayed checksub query ran against carrier API */
    delayedChecksubExecutedAt: {
      name: 'delayed_checksub_executed_at',
      type: 'timestamp',
      nullable: true,
    },
    /** @type {string|null} Carrier subscription classification outcome ('ACTIVE', 'GRACE', 'SUSPENDED') */
    delayedChecksubOutcome: {
      name: 'delayed_checksub_outcome',
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    /** @type {string|null} Raw JSON/XML response body from carrier checksub endpoint */
    delayedChecksubResponse: {
      name: 'delayed_checksub_response',
      type: 'text',
      nullable: true,
    },
  },
  indices: [
    {
      name: 'UQ_conversion_postbacks_msisdn',
      columns: ['msisdn'],
      unique: true,
    },
    { name: 'IDX_postbacks_visit', columns: ['visitId'] },
    { name: 'IDX_postbacks_campid', columns: ['campid'] },
    { name: 'IDX_postbacks_click_id', columns: ['clickId'] },
    {
      name: 'IDX_postbacks_delayed_checksub',
      columns: ['delayedChecksubStatus', 'delayedChecksubScheduledAt'],
    },
  ],
});
