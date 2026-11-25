/**
 * Schema cleanup aligned with docs/WAP_MANAGER_DESIGN.md
 * - Drop otp_requests (partner-only OTP)
 * - Drop api_configs.user_api, api_configs.otp_provider
 * - Remove legacy campaign page types
 * - Harden campaign_trackings (updated_at + unique)
 */
import {
  ensureColumn,
  ensureDropColumn,
  ensureIndex,
  isColumnNullable,
} from './migration-helpers.js';

export class SchemaCleanup1810000000000 {
  name = 'SchemaCleanup1810000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      // Table drops disabled to prevent accidental data loss
      await ensureDropColumn(queryRunner, 'api_configs', 'user_api');
      await ensureDropColumn(queryRunner, 'api_configs', 'otp_provider');

      await queryRunner.query(`
        DELETE FROM "campaign_pages"
        WHERE "page_type" IN ('LANDING', 'OTP_PROMPT', 'SUCCESS', 'PLAN')
      `);

      await ensureColumn(
        queryRunner,
        'campaign_trackings',
        'updated_at',
        `ALTER TABLE "campaign_trackings" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
      );

      // Deduplicate trackings before unique index
      await queryRunner.query(`
        DELETE FROM "campaign_trackings" a
        USING "campaign_trackings" b
        WHERE a.id > b.id
          AND a.campaign_id = b.campaign_id
          AND a.vendor_id = b.vendor_id
          AND COALESCE(a.affiliate_id, 0) = COALESCE(b.affiliate_id, 0)
      `);

      await ensureIndex(
        queryRunner,
        'campaign_trackings',
        'UQ_campaign_trackings_camp_vendor_aff',
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_campaign_trackings_camp_vendor_aff"
         ON "campaign_trackings" ("campaign_id", "vendor_id", (COALESCE("affiliate_id", 0)))`,
      );

      // Backfill operator_id gaps is done in seed; enforce NOT NULL only when all rows have it
      if (await isColumnNullable(queryRunner, 'campaigns', 'operator_id')) {
        const nullOps = await queryRunner.query(
          `SELECT COUNT(*)::int AS c FROM "campaigns" WHERE "operator_id" IS NULL`,
        );
        if (Number(nullOps[0]?.c || 0) === 0) {
          await queryRunner.query(
            `ALTER TABLE "campaigns" ALTER COLUMN "operator_id" SET NOT NULL`,
          );
        }
      }
    } else {
      // Table drops disabled to prevent accidental data loss
      await ensureDropColumn(queryRunner, 'api_configs', 'user_api');
      await ensureDropColumn(queryRunner, 'api_configs', 'otp_provider');

      await queryRunner.query(`
        DELETE FROM \`campaign_pages\`
        WHERE \`page_type\` IN ('LANDING', 'OTP_PROMPT', 'SUCCESS', 'PLAN')
      `);

      await ensureColumn(
        queryRunner,
        'campaign_trackings',
        'updated_at',
        `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
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
