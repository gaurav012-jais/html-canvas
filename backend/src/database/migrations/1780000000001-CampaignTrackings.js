import { ensureConstraint, ensureIndex } from './migration-helpers.js';

export class CampaignTrackings1780000000001 {
  name = 'CampaignTrackings1780000000001';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasTable('campaign_trackings'))) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "campaign_trackings" (
            "id" SERIAL NOT NULL,
            "campaign_id" integer NOT NULL,
            "vendor_id" integer NOT NULL,
            "affiliate_id" integer,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_campaign_trackings" PRIMARY KEY ("id")
          )
        `);

        await ensureIndex(
          queryRunner,
          'campaign_trackings',
          'IDX_campaign_trackings_campaign_id',
          `CREATE INDEX IF NOT EXISTS "IDX_campaign_trackings_campaign_id" ON "campaign_trackings" ("campaign_id")`,
        );
        await ensureIndex(
          queryRunner,
          'campaign_trackings',
          'IDX_campaign_trackings_vendor_id',
          `CREATE INDEX IF NOT EXISTS "IDX_campaign_trackings_vendor_id" ON "campaign_trackings" ("vendor_id")`,
        );
        await ensureIndex(
          queryRunner,
          'campaign_trackings',
          'IDX_campaign_trackings_affiliate_id',
          `CREATE INDEX IF NOT EXISTS "IDX_campaign_trackings_affiliate_id" ON "campaign_trackings" ("affiliate_id")`,
        );

        await ensureConstraint(
          queryRunner,
          'campaign_trackings',
          'FK_campaign_trackings_campaign',
          `ALTER TABLE "campaign_trackings" ADD CONSTRAINT "FK_campaign_trackings_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );
        await ensureConstraint(
          queryRunner,
          'campaign_trackings',
          'FK_campaign_trackings_vendor',
          `ALTER TABLE "campaign_trackings" ADD CONSTRAINT "FK_campaign_trackings_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );
        await ensureConstraint(
          queryRunner,
          'campaign_trackings',
          'FK_campaign_trackings_affiliate',
          `ALTER TABLE "campaign_trackings" ADD CONSTRAINT "FK_campaign_trackings_affiliate" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );

        if (await queryRunner.hasTable('campaign_vendors')) {
          await queryRunner.query(
            `INSERT INTO "campaign_trackings" ("campaign_id", "vendor_id") SELECT "campaign_id", "vendor_id" FROM "campaign_vendors"`,
          );
          // Table drops disabled to prevent accidental data loss
        }
      }
    } else {
      if (!(await queryRunner.hasTable('campaign_trackings'))) {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS \`campaign_trackings\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`campaign_id\` int NOT NULL,
            \`vendor_id\` int NOT NULL,
            \`affiliate_id\` int NULL,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            INDEX \`IDX_campaign_trackings_campaign_id\` (\`campaign_id\`),
            INDEX \`IDX_campaign_trackings_vendor_id\` (\`vendor_id\`),
            INDEX \`IDX_campaign_trackings_affiliate_id\` (\`affiliate_id\`),
            CONSTRAINT \`FK_campaign_trackings_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`FK_campaign_trackings_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`FK_campaign_trackings_affiliate\` FOREIGN KEY (\`affiliate_id\`) REFERENCES \`affiliates\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB
        `);

        if (await queryRunner.hasTable('campaign_vendors')) {
          await queryRunner.query(
            `INSERT INTO \`campaign_trackings\` (\`campaign_id\`, \`vendor_id\`) SELECT \`campaign_id\`, \`vendor_id\` FROM \`campaign_vendors\``,
          );
          // Table drops disabled to prevent accidental data loss
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
