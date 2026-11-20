import { EntitySchema } from 'typeorm';

/**
 * User Entity Model
 *
 * Represents an authenticated user in the TemplateCraft dashboard.
 * Users can create campaigns, design templates, and manage affiliate trackings.
 * A single user with email matching ADMIN_EMAIL serves as dashboard superadmin.
 *
 * @class User
 */
export class User {}

/**
 * TypeORM Schema Definition for User
 * Maps to the `users` table.
 */
export const UserSchema = new EntitySchema({
  name: 'User',
  target: User,
  tableName: 'users',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Unique email address used for dashboard login */
    email: {
      type: 'varchar',
      unique: true,
    },
    /** @type {string} Bcrypt hashed password (excluded from queries by default) */
    password: {
      type: 'varchar',
      select: false,
    },
    /** @type {string} Full display name */
    name: {
      type: 'varchar',
    },
    /** @type {string|null} Optional avatar image URL or asset key */
    avatar: {
      type: 'varchar',
      nullable: true,
    },
    /** @type {string} Account status: 'active' | 'inactive' | 'suspended' */
    status: {
      name: 'status',
      type: 'varchar',
      length: 16,
      default: 'active',
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
});
