import { EntitySchema } from 'typeorm';

// Core domain model representing a subscription offer for a Country + Operator
export class Campaign {}

export const CampaignSchema = new EntitySchema({
  name: 'Campaign',
  target: Campaign,
  tableName: 'campaigns',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar',
    },
    country: {
      type: 'varchar', // Country name (e.g. 'UAE', 'Jordan', 'Burkina Faso')
    },
    operator: {
      type: 'varchar', // Operator name (e.g. 'Etisalat', 'Zain', 'Orange BF')
    },
    operatorId: {
      name: 'operator_id',
      type: 'int',
      nullable: true, // FK -> operators.id
    },
    serviceId: {
      name: 'service_id',
      type: 'varchar',
      nullable: true, // Telco partner service ID
    },
    active: {
      type: 'boolean',
      default: false,
    },
    userId: {
      name: 'user_id',
      type: 'int', // Account owner user ID
    },
    verificationMode: {
      name: 'verification_mode',
      type: 'varchar',
      length: 16,
      nullable: true, // 'OTP' | 'HE' | 'DCB' | 'BOTH' | 'UNIVERSE_DCB' | 'ORANGE_BF' | 'NONE'
    },
    flowConfig: {
      name: 'flow_config',
      type: 'text',
      nullable: true, // State machine graph & routing JSON
    },
    cgRedirectUrl: {
      name: 'cg_redirect_url',
      type: 'varchar',
      length: 1024,
      nullable: true, // Consent Gateway (CG) redirect URL
    },
    successRedirectUrl: {
      name: 'success_redirect_url',
      type: 'varchar',
      length: 1024,
      nullable: true, // Final portal / thank-you destination URL
    },
    successRedirectMode: {
      name: 'success_redirect_mode',
      type: 'varchar',
      length: 16,
      default: 'thankyou', // 'thankyou' (delayed) | 'immediate'
    },
    postbackRegisterAt: {
      name: 'postback_register_at',
      type: 'varchar',
      length: 16,
      default: 'confirm', // 'confirm' | 'otp' | 'both'
    },
    funnelLayout: {
      name: 'funnel_layout',
      type: 'varchar',
      length: 32,
      default: 'classic', // 'classic' (HOME -> OTP) | 'packs_on_home' (OTP -> HOME)
    },
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
      nullable: true, // Filter for operator callbacks to trigger postbacks
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
      nullable: true,
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
      nullable: true, // Reroute target when capping threshold is reached
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
    marketOperator: {
      type: 'many-to-one',
      target: 'Operator',
      inverseSide: 'campaigns',
      joinColumn: { name: 'operator_id' },
      onDelete: 'SET NULL',
      nullable: true,
    },
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE',
    },
    trackings: {
      type: 'one-to-many',
      target: 'CampaignTracking',
      inverseSide: 'campaign',
    },
    pages: {
      type: 'one-to-many',
      target: 'CampaignPage',
      inverseSide: 'campaign',
    },
  },
  indices: [
    {
      name: 'IDX_CAMPAIGN_OPERATOR_NAME',
      unique: true,
      columns: ['operatorId', 'name'],
    },
  ],
});
