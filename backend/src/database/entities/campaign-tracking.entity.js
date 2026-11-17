import { EntitySchema } from 'typeorm';

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
      type: 'int',
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int',
    },
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true,
    },
    active: {
      type: 'boolean',
      default: true,
    },
    /** API-expose: % of partner-success OTP verifies shown to this vendor. */
    payoutPercent: {
      name: 'payout_percent',
      type: 'int',
      default: 100,
    },
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
      nullable: true,
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
      default: 'conversions',
    },
    cappingLimit: {
      name: 'capping_limit',
      type: 'int',
      nullable: true,
    },
    cappingAction: {
      name: 'capping_action',
      type: 'varchar',
      length: 16,
      default: 'stop',
    },
    cappingInterval: {
      name: 'capping_interval',
      type: 'varchar',
      length: 16,
      default: 'daily',
    },
    fallbackCampaignId: {
      name: 'fallback_campaign_id',
      type: 'int',
      nullable: true,
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
