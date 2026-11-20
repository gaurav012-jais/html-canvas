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
      if (!(await queryRunner.hasColumn('visits', 'checksub_status'))) {
        await queryRunner.query(
          `ALTER TABLE "visits" ADD COLUMN "checksub_status" varchar(32) NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('visits', 'checksub_executed_at'))) {
        await queryRunner.query(
          `ALTER TABLE "visits" ADD COLUMN "checksub_executed_at" timestamp NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('visits', 'checksub_response'))) {
        await queryRunner.query(
          `ALTER TABLE "visits" ADD COLUMN "checksub_response" text NULL`,
        );
      }
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_visits_checksub_status" ON "visits" ("checksub_status")`,
      );
    } else {
      if (!(await queryRunner.hasColumn('visits', 'checksub_status'))) {
        await queryRunner.query(
          `ALTER TABLE \`visits\` ADD COLUMN \`checksub_status\` varchar(32) NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('visits', 'checksub_executed_at'))) {
        await queryRunner.query(
          `ALTER TABLE \`visits\` ADD COLUMN \`checksub_executed_at\` timestamp NULL`,
        );
      }
      if (!(await queryRunner.hasColumn('visits', 'checksub_response'))) {
        await queryRunner.query(
          `ALTER TABLE \`visits\` ADD COLUMN \`checksub_response\` text NULL`,
        );
      }
      await queryRunner.query(
        `CREATE INDEX \`IDX_visits_checksub_status\` ON \`visits\` (\`checksub_status\`)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const cols = [
      'checksub_status',
      'checksub_executed_at',
      'checksub_response',
    ];

    if (isPostgres) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_visits_checksub_status"`,
      );
      for (const col of cols) {
        await queryRunner.query(
          `ALTER TABLE "visits" DROP COLUMN IF EXISTS "${col}"`,
        );
      }
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_visits_checksub_status\` ON \`visits\``,
      );
      for (const col of cols) {
        await queryRunner.query(
          `ALTER TABLE \`visits\` DROP COLUMN IF EXISTS \`${col}\``,
        );
      }
    }
  }
}
