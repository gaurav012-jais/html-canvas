import { EntitySchema } from 'typeorm';

// Attribution channel linking Campaign + Vendor (+ optional Affiliate)
export class CampaignTracking {}

export const CampaignTrackingSchema = new EntitySchema({
  name: 'CampaignTracking',
  target: CampaignTracking,
  tableName: 'campaign_trackings',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int', // FK -> campaigns.id
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int', // FK -> vendors.id
    },
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true, // FK -> affiliates.id
    },
    active: {
      type: 'boolean',
      default: true,
    },
    payoutPercent: {
      name: 'payout_percent',
      type: 'int',
      default: 100, // Shaving control: 0-100% of conversions forwarded to vendor
    },
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
      nullable: true, // Comma-separated allowed statuses
    },
    cappingEnabled: {
      name: 'capping_enabled',
      type: 'boolean',
      default: false,
    },
    cappingMetric: {
      name: 'capping_metric',
      type: 'varchar',
      length: 16,
      default: 'conversions', // 'conversions' | 'clicks'
    },
    cappingLimit: {
      name: 'capping_limit',
      type: 'int',
      nullable: true, // Max conversion/click threshold
    },
    cappingAction: {
      name: 'capping_action',
      type: 'varchar',
      length: 16,
      default: 'stop', // 'stop' | 'fallback'
    },
    fallbackCampaignId: {
      name: 'fallback_campaign_id',
      type: 'int',
      nullable: true, // Target campaign when capping action is 'fallback'
    },
    cappingInterval: {
      name: 'capping_interval',
      type: 'varchar',
      length: 16,
      default: 'daily', // 'daily' | 'weekly' | 'monthly' | 'total'
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
  relations: {
    campaign: {
      type: 'many-to-one',
      target: 'Campaign',
      inverseSide: 'trackings',
      joinColumn: { name: 'campaign_id' },
      onDelete: 'CASCADE',
    },
    vendor: {
      type: 'many-to-one',
      target: 'Vendor',
      joinColumn: { name: 'vendor_id' },
      onDelete: 'CASCADE',
    },
    affiliate: {
      type: 'many-to-one',
      target: 'Affiliate',
      joinColumn: { name: 'affiliate_id' },
      onDelete: 'CASCADE',
      nullable: true,
    },
  },
});
