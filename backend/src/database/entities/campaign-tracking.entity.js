import { EntitySchema } from 'typeorm';

/**
 * CampaignTracking Entity Model
 *
 * Links a Campaign with a Vendor and optional sub-Affiliate.
 * Represents an active attribution channel / tracking link.
 * Controls traffic routing, shaving/hair-cutting via payout percentage (0-100),
 * carrier callback status filters, and vendor-specific traffic capping policies.
 *
 * @class CampaignTracking
 */
export class CampaignTracking {}

/**
 * TypeORM Schema Definition for CampaignTracking
 * Maps to the `campaign_trackings` table.
 */
export const CampaignTrackingSchema = new EntitySchema({
  name: 'CampaignTracking',
  target: CampaignTracking,
  tableName: 'campaign_trackings',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number} Foreign key referencing `campaigns.id` */
    campaignId: {
      name: 'campaign_id',
      type: 'int',
    },
    /** @type {number} Foreign key referencing `vendors.id` */
    vendorId: {
      name: 'vendor_id',
      type: 'int',
    },
    /** @type {number|null} Optional foreign key referencing `affiliates.id` */
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true,
    },
    /** @type {boolean} Active status: true if this tracking link is enabled and accepts traffic */
    active: {
      type: 'boolean',
      default: true,
    },
    /**
     * @type {number} Payout percentage (0–100).
     * Controls traffic shaving: percentage of genuine conversions reported/forwarded to the vendor postback URL.
     */
    payoutPercent: {
      name: 'payout_percent',
      type: 'int',
      default: 100,
    },
    /** @type {string|null} Comma-separated list of allowed callback statuses for this vendor-campaign pairing */
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
      nullable: true,
    },
    /** @type {boolean} Toggle vendor-specific traffic volume capping */
    cappingEnabled: {
      name: 'capping_enabled',
      type: 'boolean',
      default: false,
    },
    /** @type {string} Metric used for capping evaluation: 'conversions' | 'clicks' */
    cappingMetric: {
      name: 'capping_metric',
      type: 'varchar',
      length: 16,
      default: 'conversions',
    },
    /** @type {number|null} Numeric cap threshold (e.g. 200 conversions) */
    cappingLimit: {
      name: 'capping_limit',
      type: 'int',
      nullable: true,
    },
    /** @type {string} Action when cap is hit: 'stop' (block traffic) | 'fallback' (reroute traffic) */
    cappingAction: {
      name: 'capping_action',
      type: 'varchar',
      length: 16,
      default: 'stop',
    },
    /** @type {number|null} Target fallback campaign ID when capping action is 'fallback' */
    fallbackCampaignId: {
      name: 'fallback_campaign_id',
      type: 'int',
      nullable: true,
    },
    /** @type {string} Reset interval for capping calculation: 'daily' | 'weekly' | 'monthly' | 'total' */
    cappingInterval: {
      name: 'capping_interval',
      type: 'varchar',
      length: 16,
      default: 'daily',
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
  },
  relations: {
    /** @type {import('./campaign.entity.js').Campaign} Parent campaign */
    campaign: {
      type: 'many-to-one',
      target: 'Campaign',
      inverseSide: 'trackings',
      joinColumn: { name: 'campaign_id' },
      onDelete: 'CASCADE',
    },
    /** @type {import('./vendor.entity.js').Vendor} Associated traffic vendor */
    vendor: {
      type: 'many-to-one',
      target: 'Vendor',
      joinColumn: { name: 'vendor_id' },
      onDelete: 'CASCADE',
    },
    /** @type {import('./affiliate.entity.js').Affiliate|null} Associated sub-affiliate */
    affiliate: {
      type: 'many-to-one',
      target: 'Affiliate',
      joinColumn: { name: 'affiliate_id' },
      onDelete: 'CASCADE',
      nullable: true,
    },
  },
});
