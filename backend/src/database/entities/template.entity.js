import { EntitySchema } from 'typeorm';

/**
 * Template Entity Model
 *
 * Stores visual page designs constructed via the GrapesJS drag-and-drop editor.
 * Contains serialized HTML, CSS, component tree, typography, and asset references.
 * Templates can be prebuilt (system defaults) or user-authored custom designs.
 *
 * @class Template
 */
/**
 * Template — stores visual page designs constructed via GrapesJS editor,
 * including HTML, CSS, component tree, and assets.
 */
export class Template { }

/**
 * TypeORM Schema Definition for Template
 * Maps to the `templates` table.
 */
export const TemplateSchema = new EntitySchema({
  name: 'Template',
  target: Template,
  tableName: 'templates',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    /** Primary key */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {string} Template display name */
    /** Template display name */
    name: {
      type: 'varchar',
    },
    /** @type {Record<string, any>} GrapesJS JSON structure containing html, css, components, styles, and assets */
    /** GrapesJS JSON data structure containing html, css, components, styles, and assets */
    data: {
      type: 'json',
    },
    /** @type {number|null} Creator/Owner user ID (null for system prebuilt templates) */
    /** Creator / Owner user ID (null for system prebuilt templates) */
    userId: {
      name: 'user_id',
      type: 'int',
      nullable: true,
    },
    /** @type {boolean} Flag indicating whether this is a pre-shipped default system template */
    /** Flag indicating whether this is a pre-shipped default system template */
    isPrebuilt: {
      name: 'is_prebuilt',
      type: 'boolean',
      default: false,
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
