import { EntitySchema } from 'typeorm';

/**
 * DailyStat Entity Model
 *
 * Pre-aggregated summary metrics for rapid dashboard analytics and vendor reporting.
 * Aggregation grain is: `statDate` (YYYY-MM-DD) × `timezone` × `campaignId` × `vendorId`.
 * Periodically updated/rolled by the analytics cron scheduler from raw `visits`,
 * `visit_events`, and `conversion_postbacks` tables.
 *
 * @class DailyStat
 */
export class DailyStat {}

/**
 * TypeORM Schema Definition for DailyStat
 * Maps to the `daily_stats` table.
 */
export const DailyStatSchema = new EntitySchema({
  name: 'DailyStat',
  target: DailyStat,
  tableName: 'daily_stats',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Calendar date string (YYYY-MM-DD) calculated within the specified `timezone` */
    statDate: {
      name: 'stat_date',
      type: 'varchar',
      length: 10,
    },
    /** @type {string} Reporting timezone identifier (e.g. 'Asia/Kolkata', 'UTC') */
    timezone: {
      type: 'varchar',
      length: 64,
      default: 'Asia/Kolkata',
    },
    /** @type {number} Campaign identifier (0 represents aggregate across all campaigns) */
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      default: 0,
    },
    /** @type {number} Vendor identifier (0 represents aggregate across all vendors) */
    vendorId: {
      name: 'vendor_id',
      type: 'int',
      default: 0,
    },
    /** @type {number} Total count of inbound visits */
    visits: { type: 'int', default: 0 },
    /** @type {number} Count of visits where subscriber MSISDN was resolved via Header Enrichment */
    msisdnResolved: { name: 'msisdn_resolved', type: 'int', default: 0 },
    /** @type {number} Count of visits where HE failed and fallback redirect to Carrier Gateway was triggered */
    heFailCg: { name: 'he_fail_cg', type: 'int', default: 0 },
    /** @type {number} Count of OTP SMS PIN requests dispatched */
    otpSend: { name: 'otp_send', type: 'int', default: 0 },
    /** @type {number} Count of OTP PIN codes successfully validated */
    otpVerify: { name: 'otp_verify', type: 'int', default: 0 },
    /** @type {number} Count of successful carrier subscription confirmations */
    subscribeSuccess: { name: 'subscribe_success', type: 'int', default: 0 },
    /** @type {number} Count of failed or rejected subscription attempts */
    subscribeFailed: { name: 'subscribe_failed', type: 'int', default: 0 },
    /** @type {number} Count of postbacks added to the outbound dispatch queue */
    postbacksQueued: { name: 'postbacks_queued', type: 'int', default: 0 },
    /** @type {number} Count of postbacks currently in pending delivery state */
    pending: { type: 'int', default: 0 },
    /** @type {number} Count of billing notification webhooks received from telecom carriers */
    billingReceived: { name: 'billing_received', type: 'int', default: 0 },
    /** @type {number} Count of conversion postbacks successfully delivered to vendors */
    vendorSent: { name: 'vendor_sent', type: 'int', default: 0 },
    /** @type {number} Count of conversion postback deliveries that failed */
    vendorFailed: { name: 'vendor_failed', type: 'int', default: 0 },
    /** @type {number} Count of postbacks skipped due to deduplication, capping, or payout shaving */
    skipped: { type: 'int', default: 0 },
    /** @type {number} Count of carrier callbacks that could not be correlated to an active visit session */
    unmatchedCallbacks: {
      name: 'unmatched_callbacks',
      type: 'int',
      default: 0,
    },
    /** @type {Record<string, number>|null} Aggregated operator callback status distribution (e.g. {"ACTIVE": 140, "GRACE": 12}) */
    operatorStatusJson: {
      name: 'operator_status_json',
      type: 'json',
      nullable: true,
    },
    /** @type {Date} Timestamp when this daily metrics record was rolled or updated */
    rolledAt: {
      name: 'rolled_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
  indices: [
    {
      name: 'UQ_daily_stats_grain',
      columns: ['statDate', 'timezone', 'campaignId', 'vendorId'],
      unique: true,
    },
    { name: 'IDX_daily_stats_date', columns: ['statDate'] },
    { name: 'IDX_daily_stats_campaign', columns: ['campaignId', 'statDate'] },
    { name: 'IDX_daily_stats_vendor', columns: ['vendorId', 'statDate'] },
  ],
});
