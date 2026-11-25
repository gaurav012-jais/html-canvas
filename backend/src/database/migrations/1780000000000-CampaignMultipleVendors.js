import {
  ensureConstraint,
  ensureDropColumn,
  ensureIndex,
} from './migration-helpers.js';

export class CampaignMultipleVendors1780000000000 {
  name = 'CampaignMultipleVendors1780000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasTable('campaign_vendors'))) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "campaign_vendors" (
            "campaign_id" integer NOT NULL,
            "vendor_id" integer NOT NULL,
            CONSTRAINT "PK_campaign_vendors" PRIMARY KEY ("campaign_id", "vendor_id")
          )
        `);

        await ensureIndex(
          queryRunner,
          'campaign_vendors',
          'IDX_campaign_vendors_campaign_id',
          `CREATE INDEX IF NOT EXISTS "IDX_campaign_vendors_campaign_id" ON "campaign_vendors" ("campaign_id")`,
        );

        await ensureIndex(
          queryRunner,
          'campaign_vendors',
          'IDX_campaign_vendors_vendor_id',
          `CREATE INDEX IF NOT EXISTS "IDX_campaign_vendors_vendor_id" ON "campaign_vendors" ("vendor_id")`,
        );

        await ensureConstraint(
          queryRunner,
          'campaign_vendors',
          'FK_campaign_vendors_campaign',
          `ALTER TABLE "campaign_vendors" ADD CONSTRAINT "FK_campaign_vendors_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );

        await ensureConstraint(
          queryRunner,
          'campaign_vendors',
          'FK_campaign_vendors_vendor',
          `ALTER TABLE "campaign_vendors" ADD CONSTRAINT "FK_campaign_vendors_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );

        if (await queryRunner.hasColumn('campaigns', 'vendor_id')) {
          await queryRunner.query(
            `INSERT INTO "campaign_vendors" ("campaign_id", "vendor_id") SELECT "id", "vendor_id" FROM "campaigns" WHERE "vendor_id" IS NOT NULL ON CONFLICT DO NOTHING`,
          );
          await ensureDropColumn(queryRunner, 'campaigns', 'vendor_id');
        }
      }
    } else {
      if (!(await queryRunner.hasTable('campaign_vendors'))) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS \`campaign_vendors\` (
            \`campaign_id\` int NOT NULL,
            \`vendor_id\` int NOT NULL,
            PRIMARY KEY (\`campaign_id\`, \`vendor_id\`),
            INDEX \`IDX_campaign_vendors_campaign_id\` (\`campaign_id\`),
            INDEX \`IDX_campaign_vendors_vendor_id\` (\`vendor_id\`),
            CONSTRAINT \`FK_campaign_vendors_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`FK_campaign_vendors_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB
        `);

        if (await queryRunner.hasColumn('campaigns', 'vendor_id')) {
          await queryRunner.query(
            `INSERT IGNORE INTO \`campaign_vendors\` (\`campaign_id\`, \`vendor_id\`) SELECT \`id\`, \`vendor_id\` FROM \`campaigns\` WHERE \`vendor_id\` IS NOT NULL`,
          );
          await ensureDropColumn(queryRunner, 'campaigns', 'vendor_id');
        }
      }
    }
  }

  async down(queryRunner) {
    // Disabled down migration to protect tables from accidental drop/data loss
    throw new Error(
      'Down migrations are disabled to prevent accidental table drops.',
    );
  }
}
