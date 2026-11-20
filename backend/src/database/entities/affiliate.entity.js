import { EntitySchema } from 'typeorm';

/**
 * Affiliate Entity Model
 *
 * Sub-partner, media buyer, or publisher nested under a parent Vendor network.
 * Allows tracking granular source attribution via `?aff_id=` in tracking URLs.
 * Can define custom postback URLs overriding the vendor-level default URL.
 *
 * @class Affiliate
 */
/**
 * Affiliate — sub-partner or publisher under a Vendor network.
 * Can override postback URLs and receive segmented attribution (?aff_id=AFF01).
 */
export class Affiliate { }

/**
 * TypeORM Schema Definition for Affiliate
 * Maps to the `affiliates` table.
 */
export const AffiliateSchema = new EntitySchema({
  name: 'Affiliate',
  target: Affiliate,
  tableName: 'affiliates',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    /** Primary key */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number} Foreign key referencing parent `vendors.id` */
    /** Foreign key to parent vendors table */
    vendorId: {
      name: 'vendor_id',
      type: 'int',
    },
    /** @type {string} Affiliate or publisher display name */
    /** Affiliate name / identifier */
    name: {
      type: 'varchar',
    },
    /** @type {string} Unique affiliate shortcode in attribution URLs (?aff_id=AFF01) */
    /** Affiliate shortcode in attribution URLs (?aff_id=) */
    code: {
      type: 'varchar',
    },
    /** @type {number} Administrator/Account owner user ID */
    /** Administrator user ID */
    userId: {
      name: 'user_id',
      type: 'int',
    },
    /** @type {boolean} Status flag: true if affiliate is allowed to traffic offers */
    /** Active status */
    active: {
      type: 'boolean',
      default: true,
    },
    /** @type {string|null} Optional affiliate-level postback URL override with macro tokens */
    /** Optional affiliate-level postback URL override */
    postbackUrl: {
      name: 'postback_url',
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
    /** @type {import('./vendor.entity.js').Vendor} Parent vendor organisation */
    vendor: {
      type: 'many-to-one',
      target: 'Vendor',
      inverseSide: 'affiliates',
      joinColumn: { name: 'vendor_id' },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'IDX_AFFILIATE_USER_CODE',
      unique: true,
      columns: ['userId', 'code'],
    },
  ],
});
