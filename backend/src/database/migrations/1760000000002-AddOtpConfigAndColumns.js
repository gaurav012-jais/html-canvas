import { ensureColumn, isColumnNullable } from './migration-helpers.js';

export class AddOtpConfigAndColumns1760000000002 {
  name = 'AddOtpConfigAndColumns1760000000002';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (await queryRunner.hasTable('otp_requests')) {
        await ensureColumn(queryRunner, 'otp_requests', 'campaign_id', `ALTER TABLE "otp_requests" ADD COLUMN "campaign_id" integer`);
        await ensureColumn(queryRunner, 'otp_requests', 'provider', `ALTER TABLE "otp_requests" ADD COLUMN "provider" varchar`);
        await ensureColumn(queryRunner, 'otp_requests', 'provider_request_id', `ALTER TABLE "otp_requests" ADD COLUMN "provider_request_id" varchar`);
        await ensureColumn(queryRunner, 'otp_requests', 'status', `ALTER TABLE "otp_requests" ADD COLUMN "status" varchar NOT NULL DEFAULT 'pending'`);
        await ensureColumn(queryRunner, 'otp_requests', 'verified_at', `ALTER TABLE "otp_requests" ADD COLUMN "verified_at" TIMESTAMP`);
        await ensureColumn(queryRunner, 'otp_requests', 'updated_at', `ALTER TABLE "otp_requests" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        if (!(await isColumnNullable(queryRunner, 'otp_requests', 'otp_salt'))) {
          await queryRunner.query(`ALTER TABLE "otp_requests" ALTER COLUMN "otp_salt" DROP NOT NULL`);
        }
        const visitCols = await queryRunner.query(
          `SELECT data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'otp_requests' AND column_name = 'visit_id' LIMIT 1`,
        );
        if (visitCols[0]?.data_type !== 'integer') {
          await queryRunner.query(
            `ALTER TABLE "otp_requests" ALTER COLUMN "visit_id" TYPE integer USING (CASE WHEN "visit_id"::text ~ '^[0-9]+$' THEN "visit_id"::text::integer ELSE NULL END)`,
          );
        }
      }
      if (await queryRunner.hasTable('api_configs')) {
        await ensureColumn(queryRunner, 'api_configs', 'otp_provider', `ALTER TABLE "api_configs" ADD COLUMN "otp_provider" varchar`);
        await ensureColumn(queryRunner, 'api_configs', 'otp_config_json', `ALTER TABLE "api_configs" ADD COLUMN "otp_config_json" text`);
      }
    } else {
      if (await queryRunner.hasTable('otp_requests')) {
        await ensureColumn(queryRunner, 'otp_requests', 'campaign_id', `ALTER TABLE \`otp_requests\` ADD COLUMN \`campaign_id\` int NULL`);
        await ensureColumn(queryRunner, 'otp_requests', 'provider', `ALTER TABLE \`otp_requests\` ADD COLUMN \`provider\` varchar(32) NULL`);
        await ensureColumn(queryRunner, 'otp_requests', 'provider_request_id', `ALTER TABLE \`otp_requests\` ADD COLUMN \`provider_request_id\` varchar(255) NULL`);
        await ensureColumn(queryRunner, 'otp_requests', 'status', `ALTER TABLE \`otp_requests\` ADD COLUMN \`status\` varchar(32) NOT NULL DEFAULT 'pending'`);
        await ensureColumn(queryRunner, 'otp_requests', 'verified_at', `ALTER TABLE \`otp_requests\` ADD COLUMN \`verified_at\` datetime(6) NULL`);
        await ensureColumn(queryRunner, 'otp_requests', 'updated_at', `ALTER TABLE \`otp_requests\` ADD COLUMN \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`otp_requests\` MODIFY COLUMN \`otp_salt\` varchar(64) NULL, MODIFY COLUMN \`visit_id\` int NULL`);
      }
      if (await queryRunner.hasTable('api_configs')) {
        await ensureColumn(queryRunner, 'api_configs', 'otp_provider', `ALTER TABLE \`api_configs\` ADD COLUMN \`otp_provider\` varchar(32) NULL`);
        await ensureColumn(queryRunner, 'api_configs', 'otp_config_json', `ALTER TABLE \`api_configs\` ADD COLUMN \`otp_config_json\` text NULL`);
      }
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "otp_requests" 
        DROP COLUMN "campaign_id",
        DROP COLUMN "provider",
        DROP COLUMN "provider_request_id",
        DROP COLUMN "status",
        DROP COLUMN "verified_at",
        DROP COLUMN "updated_at",
        ALTER COLUMN "otp_salt" SET NOT NULL,
        ALTER COLUMN "visit_id" TYPE varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "api_configs" 
        DROP COLUMN "otp_provider",
        DROP COLUMN "otp_config_json"
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`otp_requests\` 
        DROP COLUMN \`campaign_id\`,
        DROP COLUMN \`provider\`,
        DROP COLUMN \`provider_request_id\`,
        DROP COLUMN \`status\`,
        DROP COLUMN \`verified_at\`,
        DROP COLUMN \`updated_at\`,
        MODIFY COLUMN \`otp_salt\` varchar(64) NOT NULL,
        MODIFY COLUMN \`visit_id\` varchar(64) NULL
      `);
      await queryRunner.query(`
        ALTER TABLE \`api_configs\`
        DROP COLUMN \`otp_provider\`,
        DROP COLUMN \`otp_config_json\`
      `);
    }
  }
}
