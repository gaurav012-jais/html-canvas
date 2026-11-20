import { EntitySchema } from 'typeorm';

// Visual page designs created via GrapesJS editor (HTML, CSS, component tree)
export class Template {}

export const TemplateSchema = new EntitySchema({
  name: 'Template',
  target: Template,
  tableName: 'templates',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar', // Template display name
    },
    data: {
      type: 'json', // GrapesJS JSON data (html, css, components, styles, assets)
    },
    userId: {
      name: 'user_id',
      type: 'int',
      nullable: true, // Creator user ID (null for prebuilt system templates)
    },
    isPrebuilt: {
      name: 'is_prebuilt',
      type: 'boolean',
      default: false,
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
