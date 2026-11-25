import {
  dropIndexIfExists,
  ensureColumn,
  ensureDropColumn,
  ensureIndex,
} from './migration-helpers.js';

/**
 * visits delayed 30-min checksub audit columns:
 * - checksub_status: varchar(32), nullable
 * - checksub_executed_at: timestamp, nullable
 * - checksub_response: text, nullable
 *
 * Also adds index IDX_visits_checksub_status on visits ("checksub_status").
 */
export class AddVisitsChecksubColumns1990000000002 {
  name = 'AddVisitsChecksubColumns1990000000002';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await ensureColumn(
        queryRunner,
        'visits',
        'checksub_status',
        `ALTER TABLE "visits" ADD COLUMN "checksub_status" varchar(32) NULL`,
      );
      await ensureColumn(
        queryRunner,
        'visits',
        'checksub_executed_at',
        `ALTER TABLE "visits" ADD COLUMN "checksub_executed_at" timestamp NULL`,
      );
      await ensureColumn(
        queryRunner,
        'visits',
        'checksub_response',
        `ALTER TABLE "visits" ADD COLUMN "checksub_response" text NULL`,
      );
      await ensureIndex(
        queryRunner,
        'visits',
        'IDX_visits_checksub_status',
        `CREATE INDEX IF NOT EXISTS "IDX_visits_checksub_status" ON "visits" ("checksub_status")`,
      );
    } else {
      await ensureColumn(
        queryRunner,
        'visits',
        'checksub_status',
        `ALTER TABLE \`visits\` ADD COLUMN \`checksub_status\` varchar(32) NULL`,
      );
      await ensureColumn(
        queryRunner,
        'visits',
        'checksub_executed_at',
        `ALTER TABLE \`visits\` ADD COLUMN \`checksub_executed_at\` timestamp NULL`,
      );
      await ensureColumn(
        queryRunner,
        'visits',
        'checksub_response',
        `ALTER TABLE \`visits\` ADD COLUMN \`checksub_response\` text NULL`,
      );
      await ensureIndex(
        queryRunner,
        'visits',
        'IDX_visits_checksub_status',
        `CREATE INDEX \`IDX_visits_checksub_status\` ON \`visits\` (\`checksub_status\`)`,
      );
    }
  }

  async down(queryRunner) {
    const cols = [
      'checksub_status',
      'checksub_executed_at',
      'checksub_response',
    ];

    await dropIndexIfExists(queryRunner, 'visits', 'IDX_visits_checksub_status');
    for (const col of cols) {
      await ensureDropColumn(queryRunner, 'visits', col);
    }
  }
}
