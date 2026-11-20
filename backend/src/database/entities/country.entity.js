import { EntitySchema } from 'typeorm';

/**
 * Country Entity Model
 *
 * Represents a geographic target market (e.g. UAE, South Sudan, Saudi Arabia, Burkina Faso).
 * Acts as the top-level container for mobile network operators (telecom carriers).
 *
 * @class Country
 */
/**
 * Country — top-level geographic market (e.g. UAE, South Sudan, Saudi Arabia).
 * Contains operators.
 */
export class Country { }

/**
 * TypeORM Schema Definition for Country
 * Maps to the `countries` table.
 */
export const CountrySchema = new EntitySchema({
  name: 'Country',
  target: Country,
  tableName: 'countries',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    /** Primary key */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Country common or display name (e.g. 'United Arab Emirates') */
    /** Country name string (e.g. 'UAE') */
    name: {
      type: 'varchar',
    },
    /** @type {string} ISO country alpha-2 code or shortcode (e.g. 'AE', 'SS', 'SA', 'BF') */
    /** ISO country code (e.g. 'AE', 'SS', 'SA') */
    code: {
      type: 'varchar',
      length: 16,
    },
    /** @type {number} User ID of the administrator who configured this market */
    /** User ID of the administrator who configured this market */
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
    /** @type {import('./operator.entity.js').Operator[]} Telco carriers operating in this country */
    operators: {
      type: 'one-to-many',
      target: 'Operator',
      inverseSide: 'country',
    },
  },
  indices: [
    {
      name: 'IDX_COUNTRY_USER_CODE',
      unique: true,
      columns: ['userId', 'code'],
    },
  ],
});
