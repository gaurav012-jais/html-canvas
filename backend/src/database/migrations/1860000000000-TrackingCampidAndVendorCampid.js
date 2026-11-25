/**
 * Dual campaign ids:
 * - visits.campid / conversion_postbacks.campid = vendor/network campid (postback {campid})
 * - visits.tracking_campid / conversion_postbacks.tracking_campid = our BF-OBF-11
 *
 * Legacy: conversion_postbacks already had campid — keep it as vendor column;
 * add tracking_campid alongside.
 */
import {
  ensureColumn,
  ensureDropColumn,
  ensureIndex,
} from './migration-helpers.js';

export class TrackingCampidAndVendorCampid1860000000000 {
  name = 'TrackingCampidAndVendorCampid1860000000000';

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await ensureColumn(
        queryRunner,
        'visits',
        'campid',
        `ALTER TABLE "visits" ADD COLUMN "campid" varchar(128)`,
      );
      await ensureColumn(
        queryRunner,
        'visits',
        'tracking_campid',
        `ALTER TABLE "visits" ADD COLUMN "tracking_campid" varchar(128)`,
      );
      await ensureIndex(
        queryRunner,
        'visits',
        'IDX_VISIT_CAMPID',
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_CAMPID" ON "visits" ("campid")`,
      );
      await ensureIndex(
        queryRunner,
        'visits',
        'IDX_VISIT_TRACKING_CAMPID',
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_TRACKING_CAMPID" ON "visits" ("tracking_campid")`,
      );

      // Drop mistaken offer_id from aborted attempt (if present).
      await ensureDropColumn(queryRunner, 'visits', 'offer_id');
      await ensureDropColumn(queryRunner, 'conversion_postbacks', 'offer_id');

      // If campid was renamed to tracking_campid already, restore campid for vendor.
      if (
        !(await queryRunner.hasColumn('conversion_postbacks', 'campid')) &&
        (await queryRunner.hasColumn('conversion_postbacks', 'tracking_campid'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "campid" varchar(128)`,
        );
        await queryRunner.query(
          `UPDATE "conversion_postbacks" SET "campid" = "tracking_campid" WHERE "campid" IS NULL`,
        );
      } else {
        await ensureColumn(
          queryRunner,
          'conversion_postbacks',
          'campid',
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "campid" varchar(128)`,
        );
      }

      await ensureColumn(
        queryRunner,
        'conversion_postbacks',
        'tracking_campid',
        `ALTER TABLE "conversion_postbacks" ADD COLUMN "tracking_campid" varchar(128)`,
      );
      await ensureIndex(
        queryRunner,
        'conversion_postbacks',
        'IDX_postbacks_campid',
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_campid" ON "conversion_postbacks" ("campid")`,
      );
    } else {
      await ensureColumn(
        queryRunner,
        'visits',
        'campid',
        `ALTER TABLE \`visits\` ADD COLUMN \`campid\` varchar(128) NULL`,
      );
      await ensureColumn(
        queryRunner,
        'visits',
        'tracking_campid',
        `ALTER TABLE \`visits\` ADD COLUMN \`tracking_campid\` varchar(128) NULL`,
      );
      await ensureColumn(
        queryRunner,
        'conversion_postbacks',
        'tracking_campid',
        `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`tracking_campid\` varchar(128) NULL`,
      );
    }
  }

  async down(queryRunner) {
    await ensureDropColumn(queryRunner, 'visits', 'campid');
    await ensureDropColumn(queryRunner, 'visits', 'tracking_campid');
    await ensureDropColumn(queryRunner, 'conversion_postbacks', 'tracking_campid');
  }
}
