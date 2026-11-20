import { EntitySchema } from 'typeorm';

/**
 * Operator Entity Model
 *
 * Represents a telecommunications carrier or Mobile Network Operator (MNO)
 * (e.g. Orange, Zain, Etisalat, MTN, STC) within a given Country market.
 * Hosts Direct Carrier Billing (DCB), Header Enrichment (HE), or OTP pin-flow integrations.
 *
 * @class Operator
 */
/**
 * Operator — represents a telecommunications carrier / mobile network operator
 * (e.g. Etisalat, Zain, STC, Orange) operating within a Country market.
 */
export class Operator { }

/**
 * TypeORM Schema Definition for Operator
 * Maps to the `operators` table.
 */
export const OperatorSchema = new EntitySchema({
  name: 'Operator',
  target: Operator,
  tableName: 'operators',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    /** Primary key */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Operator brand display name (e.g. 'Orange Burkina Faso', 'Zain Jordan') */
    /** Operator brand display name */
    name: {
      type: 'varchar',
    },
    /** @type {string} Operator shortcode key (e.g. 'ETISALAT', 'ZAIN', 'OBF') */
    /** Operator shortcode (e.g. 'ETISALAT', 'ZAIN', 'OBF') */
    code: {
      type: 'varchar',
      length: 64,
    },
    /** @type {number} Foreign key referencing parent `countries.id` */
    /** Foreign key to countries table */
    countryId: {
      name: 'country_id',
      type: 'int',
    },
    /** @type {number} Administrator user ID who configured this operator */
    /** Administrator user ID */
    userId: {
      name: 'user_id',
      type: 'int',
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
    /** @type {import('./country.entity.js').Country} Parent country market */
    country: {
      type: 'many-to-one',
      target: 'Country',
      inverseSide: 'operators',
      joinColumn: { name: 'country_id' },
      onDelete: 'CASCADE',
    },
    /** @type {import('./campaign.entity.js').Campaign[]} Campaigns targeting this telecom operator */
    campaigns: {
      type: 'one-to-many',
      target: 'Campaign',
      inverseSide: 'marketOperator',
    },
  },
  indices: [
    {
      name: 'IDX_OPERATOR_COUNTRY_CODE',
      unique: true,
      columns: ['countryId', 'code'],
    },
  ],
});
