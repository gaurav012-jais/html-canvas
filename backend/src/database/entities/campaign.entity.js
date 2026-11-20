import { EntitySchema } from 'typeorm';

/**
 * Campaign Entity Model
 *
 * Core domain model representing a subscription offer for a specific Country + Operator.
 * Encapsulates the user acquisition funnel, verification flows (OTP pin, Header Enrichment HE,
 * Direct Carrier Billing DCB, or hybrid BOTH), external Consent Gateway (CG) redirects,
 * traffic volume capping limits, and associations to funnel pages and affiliate tracking links.
 *
 * @class Campaign
 */
export class Campaign {}

/**
 * TypeORM Schema Definition for Campaign
 * Maps to the `campaigns` table.
 */
export const CampaignSchema = new EntitySchema({
  name: 'Campaign',
  target: Campaign,
  tableName: 'campaigns',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Display campaign name */
    name: {
      type: 'varchar',
    },
    /** @type {string} Country name string (e.g. 'UAE', 'South Sudan', 'Burkina Faso') */
    country: {
      type: 'varchar',
    },
    /** @type {string} Operator name string (e.g. 'Etisalat', 'Zain', 'Orange BF') */
    operator: {
      type: 'varchar',
    },
    /** @type {number|null} Foreign key referencing `operators.id` */
    operatorId: {
      name: 'operator_id',
      type: 'int',
      nullable: true,
    },
    /** @type {string|null} Telco partner service identifier */
    serviceId: {
      name: 'service_id',
      type: 'varchar',
      nullable: true,
    },
    /** @type {boolean} Active status: true if campaign is live and serving public traffic */
    active: {
      type: 'boolean',
      default: false,
    },
    /** @type {number} Creator / Owner user ID */
    userId: {
      name: 'user_id',
      type: 'int',
    },
    /** @type {string|null} Verification mode: 'OTP' | 'HE' | 'DCB' | 'BOTH' | 'UNIVERSE_DCB' | 'ORANGE_BF' */
    verificationMode: {
      name: 'verification_mode',
      type: 'varchar',
      length: 16,
      nullable: true,
    },
    /** @type {string|null} JSON string representation of the flow state machine and page routing graph */
    flowConfig: {
      name: 'flow_config',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} External carrier consent gateway (CG) redirect URL for 3G/4G network opt-in */
    cgRedirectUrl: {
      name: 'cg_redirect_url',
      type: 'varchar',
      length: 1024,
      nullable: true,
    },
    /** @type {string|null} Final landing / thank you destination after subscription confirmation */
    successRedirectUrl: {
      name: 'success_redirect_url',
      type: 'varchar',
      length: 1024,
      nullable: true,
    },
    /**
     * @type {string} Success redirect behavior:
     * - 'thankyou': display THANKYOU page then redirect after delay
     * - 'immediate': redirect immediately without displaying THANKYOU page
     */
    successRedirectMode: {
      name: 'success_redirect_mode',
      type: 'varchar',
      length: 16,
      default: 'thankyou',
    },
    /**
     * @type {string} Trigger event for registering vendor conversion postbacks:
     * - 'confirm': on CONFIRM page / action
     * - 'otp': on OTP verify
     * - 'both': whichever happens first
     */
    postbackRegisterAt: {
      name: 'postback_register_at',
      type: 'varchar',
      length: 16,
      default: 'confirm',
    },
    /**
     * @type {string} Funnel layout sequence:
     * - 'classic': HOME -> OTP/CONFIRM -> THANKYOU
     * - 'packs_on_home': identity-before-HOME (OTP -> HOME)
     */
    funnelLayout: {
      name: 'funnel_layout',
      type: 'varchar',
      length: 32,
      default: 'classic',
    },
    /** @type {string|null} Comma-separated list of allowed operator callback statuses to fire postbacks */
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
      nullable: true,
    },
    /** @type {boolean} Capping toggle: true to limit conversions or clicks */
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
    /** @type {number|null} Numeric cap threshold (e.g. 500) */
    cappingLimit: {
      name: 'capping_limit',
      type: 'int',
      nullable: true,
    },
    /** @type {string} Action when cap is hit: 'stop' (block traffic) | 'fallback' (reroute) */
    cappingAction: {
      name: 'capping_action',
      type: 'varchar',
      length: 16,
      default: 'stop',
    },
    /** @type {number|null} Target campaign ID to reroute traffic when capping limit is exceeded */
    fallbackCampaignId: {
      name: 'fallback_campaign_id',
      type: 'int',
      nullable: true,
    },
    /** @type {string} Reset interval for capping count: 'daily' | 'weekly' | 'monthly' | 'total' */
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
    /** @type {import('./operator.entity.js').Operator|null} Telecom carrier configuration */
    marketOperator: {
      type: 'many-to-one',
      target: 'Operator',
      inverseSide: 'campaigns',
      joinColumn: { name: 'operator_id' },
      onDelete: 'SET NULL',
      nullable: true,
    },
    /** @type {import('./user.entity.js').User} Owner user who created this campaign */
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE',
    },
    /** @type {import('./campaign-tracking.entity.js').CampaignTracking[]} Vendor tracking links for this campaign */
    trackings: {
      type: 'one-to-many',
      target: 'CampaignTracking',
      inverseSide: 'campaign',
    },
    /** @type {import('./campaign-page.entity.js').CampaignPage[]} Visual funnel pages (HOME, OTP, CONFIRM, THANKYOU) */
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
