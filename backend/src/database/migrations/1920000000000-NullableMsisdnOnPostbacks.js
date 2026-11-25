/**
 * conversion_postbacks.msisdn nullable so click_id-only billing callbacks
 * still insert a conversion row before the operator sends the number.
 */
import {
  dropIndexIfExists,
  ensureIndex,
  isColumnNullable,
} from './migration-helpers.js';

export class NullableMsisdnOnPostbacks1920000000000 {
  name = 'NullableMsisdnOnPostbacks1920000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      if (!(await isColumnNullable(queryRunner, 'conversion_postbacks', 'msisdn'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ALTER COLUMN "msisdn" DROP NOT NULL`,
        );
      }
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'IDX_postbacks_click_id',
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_click_id"
         ON "conversion_postbacks" ("click_id")`,
      );
    } else {
      if (!(await isColumnNullable(queryRunner, 'conversion_postbacks', 'msisdn'))) {
        await queryRunner.query(
          `ALTER TABLE \`conversion_postbacks\` MODIFY \`msisdn\` varchar(64) NULL`,
        );
      }
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'IDX_postbacks_click_id',
        `CREATE INDEX \`IDX_postbacks_click_id\`
         ON \`conversion_postbacks\` (\`click_id\`)`,
      );
    }
  }

  async down(queryRunner) {
    await dropIndexIfExists(queryRunner, 'conversion_postbacks', 'IDX_postbacks_click_id');
  }
}
