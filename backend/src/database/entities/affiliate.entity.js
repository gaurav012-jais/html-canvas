import { EntitySchema } from 'typeorm';

// Affiliate — sub-partner or publisher under a Vendor network (?aff_id=AFF01)
export class Affiliate {}

export const AffiliateSchema = new EntitySchema({
  name: 'Affiliate',
  target: Affiliate,
  tableName: 'affiliates',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int', // FK -> vendors.id
    },
    name: {
      type: 'varchar',
    },
    code: {
      type: 'varchar', // Shortcode in tracking URLs (?aff_id=)
    },
    userId: {
      name: 'user_id',
      type: 'int', // Account owner user ID
    },
    active: {
      type: 'boolean',
      default: true,
    },
    postbackUrl: {
      name: 'postback_url',
      type: 'text',
      nullable: true, // Optional override for vendor default postback
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
