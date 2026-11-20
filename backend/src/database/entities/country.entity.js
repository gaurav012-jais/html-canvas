import { EntitySchema } from 'typeorm';

// Geographic target market containing telco operators
export class Country {}

export const CountrySchema = new EntitySchema({
  name: 'Country',
  target: Country,
  tableName: 'countries',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar', // Country display name (e.g. 'UAE', 'Burkina Faso')
    },
    code: {
      type: 'varchar',
      length: 16, // ISO alpha-2 or market shortcode (e.g. 'AE', 'BF')
    },
    userId: {
      name: 'user_id',
      type: 'int', // Administrator user ID
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
