/**
 * visits.rcid (affiliate click) + conversion_postbacks.rcid
 * + api_call_logs (partner checksub/subscribe/blocklist audit — DB source of truth)
 */
import { ensureColumn, ensureIndex } from './migration-helpers.js';

export class AddRcidAndApiCallLogs1830000000000 {
  name = 'AddRcidAndApiCallLogs1830000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await ensureColumn(
        queryRunner,
        'visits',
        'rcid',
        `ALTER TABLE "visits" ADD COLUMN "rcid" varchar`,
      );
      await ensureIndex(
        queryRunner,
        'visits',
        'IDX_VISIT_RCID',
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_RCID" ON "visits" ("rcid")`,
      );

      await ensureColumn(
        queryRunner,
        'conversion_postbacks',
        'rcid',
        `ALTER TABLE "conversion_postbacks" ADD COLUMN "rcid" varchar(255)`,
      );
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'IDX_postbacks_rcid',
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_rcid" ON "conversion_postbacks" ("rcid")`,
      );

      if (!(await queryRunner.hasTable('api_call_logs'))) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "api_call_logs" (
            "id" SERIAL PRIMARY KEY,
            "visit_id" int,
            "campaign_id" int,
            "msisdn" varchar(64),
            "rcid" varchar(255),
            "click_id" varchar(255),
            "call_type" varchar(32) NOT NULL,
            "request_url" text,
            "request_body" text,
            "response_status" int,
            "response_body" text,
            "success" boolean,
            "error_message" text,
            "created_at" TIMESTAMP NOT NULL DEFAULT now()
          )
        `);
      }
      await ensureIndex(
        queryRunner,
        'api_call_logs',
        'IDX_api_call_logs_msisdn',
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_msisdn" ON "api_call_logs" ("msisdn")`,
      );
      await ensureIndex(
        queryRunner,
        'api_call_logs',
        'IDX_api_call_logs_rcid',
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_rcid" ON "api_call_logs" ("rcid")`,
      );
      await ensureIndex(
        queryRunner,
        'api_call_logs',
        'IDX_api_call_logs_click_id',
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_click_id" ON "api_call_logs" ("click_id")`,
      );
      await ensureIndex(
        queryRunner,
        'api_call_logs',
        'IDX_api_call_logs_visit_id',
        `CREATE INDEX IF NOT EXISTS "IDX_api_call_logs_visit_id" ON "api_call_logs" ("visit_id")`,
      );
    } else {
      await ensureColumn(
        queryRunner,
        'visits',
        'rcid',
        `ALTER TABLE \`visits\` ADD COLUMN \`rcid\` varchar(255) NULL`,
      );
      await ensureColumn(
        queryRunner,
        'conversion_postbacks',
        'rcid',
        `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`rcid\` varchar(255) NULL`,
      );
    }
  }

  async down(queryRunner) {
    // Disabled down migration to protect tables from accidental drop/data loss
    throw new Error(
      'Down migrations are disabled to prevent accidental table drops.',
    );
  }
}
