/**
 * conversion_postbacks: one row per msisdn (SAFWAP callback_manage parity).
 * Dedupe keeping latest id, then UNIQUE(msisdn).
 */
import { dropIndexIfExists, ensureIndex } from './migration-helpers.js';

export class UniqueMsisdnOnPostbacks1870000000000 {
  name = 'UniqueMsisdnOnPostbacks1870000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      // Keep highest id per msisdn; drop older duplicates.
      await queryRunner.query(`
        DELETE FROM "conversion_postbacks" a
        USING "conversion_postbacks" b
        WHERE a.msisdn = b.msisdn
          AND a.id < b.id
      `);

      await dropIndexIfExists(queryRunner, 'conversion_postbacks', 'IDX_postbacks_msisdn_status');
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'UQ_conversion_postbacks_msisdn',
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversion_postbacks_msisdn"
         ON "conversion_postbacks" ("msisdn")`,
      );
    } else {
      await queryRunner.query(`
        DELETE a FROM \`conversion_postbacks\` a
        INNER JOIN \`conversion_postbacks\` b
          ON a.msisdn = b.msisdn AND a.id < b.id
      `);
      await dropIndexIfExists(queryRunner, 'conversion_postbacks', 'IDX_postbacks_msisdn_status');
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'UQ_conversion_postbacks_msisdn',
        `CREATE UNIQUE INDEX \`UQ_conversion_postbacks_msisdn\`
         ON \`conversion_postbacks\` (\`msisdn\`)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await dropIndexIfExists(queryRunner, 'conversion_postbacks', 'UQ_conversion_postbacks_msisdn');
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'IDX_postbacks_msisdn_status',
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_msisdn_status"
         ON "conversion_postbacks" ("msisdn", "status")`,
      );
    } else {
      await dropIndexIfExists(queryRunner, 'conversion_postbacks', 'UQ_conversion_postbacks_msisdn');
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'IDX_postbacks_msisdn_status',
        `CREATE INDEX \`IDX_postbacks_msisdn_status\`
         ON \`conversion_postbacks\` (\`msisdn\`, \`status\`)`,
      );
    }
  }
}
