import { EntitySchema } from 'typeorm';

/**
 * Vendor Entity Model
 *
 * External media partner or ad network (e.g. AdMobi, Mobite, Kimia) providing traffic.
 * Vendors purchase clicks/impressions and deliver traffic to campaigns.
 * They receive server-to-server (S2S) conversion postbacks when subscriptions succeed.
 *
 * @class Vendor
 */
/**
 * Vendor — external media partner / traffic source network (e.g. AdMobi, Mobite).
 * Buys traffic and receives conversion postbacks.
 */
export class Vendor { }

/**
 * TypeORM Schema Definition for Vendor
 * Maps to the `vendors` table.
 */
export const VendorSchema = new EntitySchema({
  name: 'Vendor',
  target: Vendor,
  tableName: 'vendors',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    /** Primary key */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Partner organization or media network display name */
    /** Partner organization / network display name */
    name: {
      type: 'varchar',
    },
    /** @type {string} Short alphanumeric identifier code used in attribution URLs (?vid=ADM01) */
    /** Short code used in attribution URLs (?vid=ADM01) */
    code: {
      type: 'varchar',
    },
    /** @type {number} Administrator/Account owner user ID */
    /** Administrator user ID */
    userId: {
      name: 'user_id',
      type: 'int',
    },
    /** @type {boolean} Status flag: true if vendor is allowed to run campaigns */
    /** Active status: true if vendor is allowed to run campaigns */
    active: {
      type: 'boolean',
      default: true,
    },
    /** @type {string|null} Default server-to-server conversion postback webhook URL with macro tokens */
    /** Default server-to-server conversion postback webhook URL */
    postbackUrl: {
      name: 'postback_url',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} Comma-separated or JSON list of allowed carrier callback statuses triggering postback delivery */
    /** Global allowed carrier callback statuses that trigger postback delivery */
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
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
    /** @type {import('./affiliate.entity.js').Affiliate[]} Child affiliates belonging to this vendor */
    affiliates: {
      type: 'one-to-many',
      target: 'Affiliate',
      inverseSide: 'vendor',
    },
  },
  indices: [
    {
      name: 'IDX_VENDOR_USER_CODE',
      unique: true,
      columns: ['userId', 'code'],
    },
  ],
});
