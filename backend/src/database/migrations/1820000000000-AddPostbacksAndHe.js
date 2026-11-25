/**
 * conversion_postbacks — pending affiliate CPA callbacks (SAFWAP callback_manage parity)
 * + vendor/affiliate postback_url
 * + campaign cg_redirect_url
 * + api_configs HE provider fields
 */
import { ensureColumn, ensureIndex } from './migration-helpers.js';

export class AddPostbacksAndHe1820000000000 {
  name = 'AddPostbacksAndHe1820000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await ensureColumn(
        queryRunner,
        'vendors',
        'postback_url',
        `ALTER TABLE "vendors" ADD COLUMN "postback_url" text`,
      );
      await ensureColumn(
        queryRunner,
        'affiliates',
        'postback_url',
        `ALTER TABLE "affiliates" ADD COLUMN "postback_url" text`,
      );
      await ensureColumn(
        queryRunner,
        'campaigns',
        'cg_redirect_url',
        `ALTER TABLE "campaigns" ADD COLUMN "cg_redirect_url" varchar(1024)`,
      );
      await ensureColumn(
        queryRunner,
        'api_configs',
        'he_provider',
        `ALTER TABLE "api_configs" ADD COLUMN "he_provider" varchar(32) DEFAULT 'header'`,
      );
      await ensureColumn(
        queryRunner,
        'api_configs',
        'he_config_json',
        `ALTER TABLE "api_configs" ADD COLUMN "he_config_json" text`,
      );

      if (!(await queryRunner.hasTable('conversion_postbacks'))) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "conversion_postbacks" (
            "id" SERIAL PRIMARY KEY,
            "visit_id" int,
            "campaign_id" int,
            "vendor_id" int,
            "affiliate_id" int,
            "msisdn" varchar(64) NOT NULL,
            "campid" varchar(128),
            "click_id" varchar(255),
            "offer_code" varchar(128),
            "postback_url" text,
            "status" varchar(32) NOT NULL DEFAULT 'pending',
            "http_status" int,
            "response_body" text,
            "error_message" text,
            "sent_at" TIMESTAMP,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now()
          )
        `);
        await ensureIndex(
          queryRunner,
          'conversion_postbacks',
          'IDX_postbacks_msisdn_status',
          `CREATE INDEX IF NOT EXISTS "IDX_postbacks_msisdn_status" ON "conversion_postbacks" ("msisdn", "status")`,
        );
        await ensureIndex(
          queryRunner,
          'conversion_postbacks',
          'IDX_postbacks_visit',
          `CREATE INDEX IF NOT EXISTS "IDX_postbacks_visit" ON "conversion_postbacks" ("visit_id")`,
        );
      }
    } else {
      // MySQL branch kept minimal — prod path is Postgres
      await ensureColumn(
        queryRunner,
        'vendors',
        'postback_url',
        `ALTER TABLE \`vendors\` ADD COLUMN \`postback_url\` text NULL`,
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
