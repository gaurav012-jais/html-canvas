import { EntitySchema } from 'typeorm';

// External media partner / traffic source network (e.g. AdMobi, Mobite)
export class Vendor {}

export const VendorSchema = new EntitySchema({
  name: 'Vendor',
  target: Vendor,
  tableName: 'vendors',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar', // Partner organization or network display name
    },
    code: {
      type: 'varchar', // Shortcode in attribution URLs (?vid=ADM01)
    },
    userId: {
      name: 'user_id',
      type: 'int', // Administrator user ID
    },
    active: {
      type: 'boolean',
      default: true,
    },
    postbackUrl: {
      name: 'postback_url',
      type: 'text',
      nullable: true, // Default S2S conversion postback webhook URL
    },
    allowedCallbackStatuses: {
      name: 'allowed_callback_statuses',
      type: 'text',
      nullable: true, // Allowed carrier callback statuses triggering postback
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
