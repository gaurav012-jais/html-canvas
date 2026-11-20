import { EntitySchema } from 'typeorm';

/**
 * CampaignPage Entity Model
 *
 * Represents a single screen/page within a campaign's conversion funnel
 * (e.g., HOME landing, OTP entry, CONFIRM consent, THANKYOU success, BLOCKED, ERROR),
 * linking to a GrapesJS visual Template.
 *
 * @class CampaignPage
 */
export class CampaignPage {}

/**
 * Funnel Page Types supported by the system.
 *
 * @readonly
 * @enum {string}
 */
export const CampaignPageType = {
  /** Landing / main offer page */
  HOME: 'HOME',
  /** Consent / double opt-in confirmation page */
  CONFIRM: 'CONFIRM',
  /** SMS PIN / OTP entry page */
  OTP: 'OTP',
  /** Post-subscription success confirmation page */
  THANKYOU: 'THANKYOU',
  /** Subscription pending / processing screen */
  INPROGRESS: 'INPROGRESS',
  /** Insufficient telco balance warning screen */
  LOW_BALANCE: 'LOW_BALANCE',
  /** Fraud / geo-block / IP restriction page */
  BLOCKED: 'BLOCKED',
  /** General error fallback page */
  ERROR: 'ERROR',
};

/** @type {string[]} Core required funnel page types */
export const REQUIRED_CAMPAIGN_PAGE_TYPES = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
];

/** @type {string[]} All valid funnel page types */
export const ALL_CAMPAIGN_PAGE_TYPES = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
  CampaignPageType.INPROGRESS,
  CampaignPageType.LOW_BALANCE,
  CampaignPageType.BLOCKED,
  CampaignPageType.ERROR,
];

/** @type {Set<string>} Statuses considered un-subscribed or new user */
export const INACTIVE_OR_NEW_STATUSES = new Set([
  'new',
  'unknown',
  'failed',
  'unsubscribed',
  'un_subscribed',
  'un_sub',
  'inactive',
  'deactivated',
  'expired',
  'cancelled',
  'canceled',
  'terminated',
  'none',
  'parked',
  'low_balance',
  '',
]);

/**
 * Resolves checksub subscriber status into the appropriate funnel page.
 * Returns null if the subscriber is inactive/new (meaning continue standard flow).
 *
 * @param {string} status - Carrier subscriber status (e.g. 'active', 'pending', 'grace')
 * @param {boolean} [isActive=false] - Explicit flag indicating active subscriber
 * @returns {string | null} Funnel page type or null
 */
export const pageTypeForSubscriptionStatus = (status, isActive = false) => {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  if (isActive || s === 'active') return CampaignPageType.THANKYOU;
  if (s === 'pending') return CampaignPageType.INPROGRESS;
  if (s === 'grace' || s === 'parking') return CampaignPageType.LOW_BALANCE;
  if (INACTIVE_OR_NEW_STATUSES.has(s)) {
    return null;
  }
  return CampaignPageType.INPROGRESS;
};

/**
 * TypeORM Schema Definition for CampaignPage
 * Maps to the `campaign_pages` table.
 */
export const CampaignPageSchema = new EntitySchema({
  name: 'CampaignPage',
  target: CampaignPage,
  tableName: 'campaign_pages',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number} Foreign key referencing parent `campaigns.id` */
    campaignId: {
      name: 'campaign_id',
      type: 'int',
    },
    /** @type {string} Type of page: 'HOME' | 'CONFIRM' | 'OTP' | 'THANKYOU' | 'INPROGRESS' | 'LOW_BALANCE' | 'BLOCKED' | 'ERROR' */
    pageType: {
      name: 'page_type',
      type: 'varchar',
    },
    /** @type {number|null} Foreign key referencing visual `templates.id` containing GrapesJS HTML/CSS design */
    templateId: {
      name: 'template_id',
      type: 'int',
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
  },
  relations: {
    /** @type {import('./campaign.entity.js').Campaign} Parent campaign */
    campaign: {
      type: 'many-to-one',
      target: 'Campaign',
      inverseSide: 'pages',
      joinColumn: { name: 'campaign_id' },
      onDelete: 'CASCADE',
    },
    /** @type {import('./template.entity.js').Template|null} Visual GrapesJS page template design */
    template: {
      type: 'many-to-one',
      target: 'Template',
      joinColumn: { name: 'template_id' },
      onDelete: 'SET NULL',
      nullable: true,
    },
  },
  indices: [
    {
      name: 'IDX_CAMPAIGN_PAGE_TYPE',
      unique: true,
      columns: ['campaignId', 'pageType'],
    },
  ],
});
