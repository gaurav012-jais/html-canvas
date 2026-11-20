import { EntitySchema } from 'typeorm';

// Telecom carrier / mobile network operator (e.g. Orange, Zain, Etisalat)
export class Operator {}

export const OperatorSchema = new EntitySchema({
  name: 'Operator',
  target: Operator,
  tableName: 'operators',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar', // Operator brand display name
    },
    code: {
      type: 'varchar',
      length: 64, // Operator shortcode (e.g. 'ETISALAT', 'ZAIN', 'OBF')
    },
    countryId: {
      name: 'country_id',
      type: 'int', // FK -> countries.id
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
    country: {
      type: 'many-to-one',
      target: 'Country',
      inverseSide: 'operators',
      joinColumn: { name: 'country_id' },
      onDelete: 'CASCADE',
    },
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
