import { EntitySchema } from 'typeorm';

// Authenticated user in the TemplateCraft dashboard
export class User {}

export const UserSchema = new EntitySchema({
  name: 'User',
  target: User,
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    email: {
      type: 'varchar',
      unique: true, // Login identifier
    },
    password: {
      type: 'varchar',
      select: false, // Bcrypt hashed password
    },
    name: {
      type: 'varchar',
    },
    avatar: {
      type: 'varchar',
      nullable: true,
    },
    status: {
      name: 'status',
      type: 'varchar',
      length: 16,
      default: 'active', // 'active' | 'inactive' | 'suspended'
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
});
