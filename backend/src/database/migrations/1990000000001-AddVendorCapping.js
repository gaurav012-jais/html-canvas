/**
 * campaign_trackings vendor capping columns:
 * - capping_enabled: boolean
 * - capping_metric: 'conversions' | 'clicks'
 * - capping_limit: int
 * - capping_action: 'stop' | 'fallback'
 * - fallback_campaign_id: int
 * - capping_interval: 'daily' | 'weekly' | 'monthly' | 'total'
 */
export class AddVendorCapping1990000000001 {
  name = 'AddVendorCapping1990000000001';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_enabled'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" ADD COLUMN "capping_enabled" boolean NOT NULL DEFAULT false`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_metric'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" ADD COLUMN "capping_metric" varchar(16) NOT NULL DEFAULT 'conversions'`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_limit'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" ADD COLUMN "capping_limit" int NULL`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_action'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" ADD COLUMN "capping_action" varchar(16) NOT NULL DEFAULT 'stop'`,
        );
      }
      if (
        !(await queryRunner.hasColumn(
          'campaign_trackings',
          'fallback_campaign_id',
        ))
      ) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" ADD COLUMN "fallback_campaign_id" int NULL`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_interval'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" ADD COLUMN "capping_interval" varchar(16) NOT NULL DEFAULT 'daily'`,
        );
      }
    } else {
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_enabled'))
      ) {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`capping_enabled\` tinyint(1) NOT NULL DEFAULT 0`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_metric'))
      ) {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`capping_metric\` varchar(16) NOT NULL DEFAULT 'conversions'`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_limit'))
      ) {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`capping_limit\` int NULL`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_action'))
      ) {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`capping_action\` varchar(16) NOT NULL DEFAULT 'stop'`,
        );
      }
      if (
        !(await queryRunner.hasColumn(
          'campaign_trackings',
          'fallback_campaign_id',
        ))
      ) {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`fallback_campaign_id\` int NULL`,
        );
      }
      if (
        !(await queryRunner.hasColumn('campaign_trackings', 'capping_interval'))
      ) {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` ADD COLUMN \`capping_interval\` varchar(16) NOT NULL DEFAULT 'daily'`,
        );
      }
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const cols = [
      'capping_enabled',
      'capping_metric',
      'capping_limit',
      'capping_action',
      'fallback_campaign_id',
      'capping_interval',
    ];
    for (const col of cols) {
      if (isPostgres) {
        await queryRunner.query(
          `ALTER TABLE "campaign_trackings" DROP COLUMN IF EXISTS "${col}"`,
        );
      } else {
        await queryRunner.query(
          `ALTER TABLE \`campaign_trackings\` DROP COLUMN \`${col}\``,
        );
      }
    }
  }
}
