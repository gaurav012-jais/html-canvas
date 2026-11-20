import { EntitySchema } from 'typeorm';

/**
 * Visit Entity Model
 *
 * Domain model representing an end-user session / traffic click through a Campaign funnel.
 * Captures:
 * - Inbound tracking & attribution parameters: vendorId, affiliateId, clickId, rcid, campid, trackingCampid
 * - Subscriber identity: phone/MSISDN (detected via network HE or entered via OTP), IP address, User-Agent
 * - Funnel progression: visitStatus ('VISIT', 'HOME_SHOWN', 'OTP_SHOWN', 'CONFIRM_SHOWN', 'SUBSCRIBED', etc.)
 * - 30-minute post-conversion carrier checksub reconciliation results
 *
 * @class Visit
 */
export class Visit {}

/**
 * High-level Funnel Progression Status Enum.
 *
 * @readonly
 * @enum {string}
 */
export const VisitStatus = {
  /** Initial inbound request received */
  VISIT: 'VISIT',
  /** Blocked by geo-IP or DND rules */
  BLOCKED: 'BLOCKED',
  /** Subscriber successfully subscribed to service */
  SUBSCRIBED: 'SUBSCRIBED',
  /** HOME landing page displayed */
  HOME_SHOWN: 'HOME_SHOWN',
  /** OTP entry page displayed */
  OTP_SHOWN: 'OTP_SHOWN',
  /** Consent confirmation page displayed */
  CONFIRM_SHOWN: 'CONFIRM_SHOWN',
  /** General success terminal state */
  SUCCESS: 'SUCCESS',
  /** Terminal error or billing failure */
  FAILED: 'FAILED',
};

/**
 * TypeORM Schema Definition for Visit
 * Maps to the `visits` table.
 */
export const VisitSchema = new EntitySchema({
  name: 'Visit',
  target: Visit,
  tableName: 'visits',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number|null} Foreign key referencing `campaigns.id` */
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      nullable: true,
    },
    /** @type {string|null} User phone number / MSISDN (detected via HE or inputted via OTP) */
    phone: {
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Country detected or targeted at time of visit */
    country: {
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Carrier operator detected or targeted at time of visit */
    operator: {
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Client IP address */
    ipAddress: {
      name: 'ip_address',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Client browser / device user agent string */
    userAgent: {
      name: 'user_agent',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Full inbound landing URL with query string */
    landingUrl: {
      name: 'landing_url',
      type: 'text',
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
    /** @type {string|null} Unique traffic partner click identifier (?click_id=) */
    clickId: {
      name: 'click_id',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Affiliate / network original click id (?rcid=) */
    rcid: {
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Inbound partner campaign identifier (?campid=) */
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
    /** @type {string|null} Raw unmapped vendor string from inbound query */
    vidRaw: {
      name: 'vid_raw',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Raw unmapped affiliate string from inbound query */
    affRaw: {
      name: 'aff_raw',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string} Current funnel progression state: 'VISIT' | 'HOME_SHOWN' | 'OTP_SHOWN' | 'CONFIRM_SHOWN' | 'SUBSCRIBED' | 'SUCCESS' | 'FAILED' | 'BLOCKED' */
    visitStatus: {
      name: 'visit_status',
      type: 'varchar',
      default: VisitStatus.VISIT,
    },
    /** @type {string|null} Last rendered page type: 'HOME' | 'OTP' | 'CONFIRM' | 'THANKYOU' */
    pageType: {
      name: 'page_type',
      type: 'varchar',
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
    /** @type {Date|null} Timestamp when partner OTP was successfully verified */
    otpVerifiedAt: {
      name: 'otp_verified_at',
      type: 'timestamp',
      nullable: true,
    },
    /** @type {string|null} Post-conversion delayed checksub result ('ACTIVE', 'GRACE', 'PARKING', 'INACTIVE') */
    checksubStatus: {
      name: 'checksub_status',
      type: 'varchar',
      length: 32,
      nullable: true,
    },
    /** @type {Date|null} Timestamp when the 30-minute delayed checksub worker evaluated this visit */
    checksubExecutedAt: {
      name: 'checksub_executed_at',
      type: 'timestamp',
      nullable: true,
    },
    /** @type {string|null} Raw response body from delayed checksub execution */
    checksubResponse: {
      name: 'checksub_response',
      type: 'text',
      nullable: true,
    },
  },
  relations: {
    /** @type {import('./visit-event.entity.js').VisitEvent[]} Detailed clickstream timeline events for this visit */
    events: {
      type: 'one-to-many',
      target: 'VisitEvent',
      inverseSide: 'visit',
    },
  },
  indices: [
    { name: 'IDX_VISIT_CAMPAIGN_ID', columns: ['campaignId'] },
    { name: 'IDX_VISIT_VENDOR_ID', columns: ['vendorId'] },
    { name: 'IDX_VISIT_AFFILIATE_ID', columns: ['affiliateId'] },
    { name: 'IDX_VISIT_CLICK_ID', columns: ['clickId'] },
    { name: 'IDX_VISIT_RCID', columns: ['rcid'] },
    { name: 'IDX_VISIT_CAMPID', columns: ['campid'] },
    { name: 'IDX_VISIT_TRACKING_CAMPID', columns: ['trackingCampid'] },
  ],
});
