import {
  dropIndexIfExists,
  ensureIndex,
  isPostgresRunner,
} from './migration-helpers.js';

/**
 * Ensures IDX_VISIT_EVENT_TYPE exists on visit_events("event_type"), matching
 * VisitEventSchema in entities/visit-event.entity.js.
 */
export class EnsureVisitEventTypeIndex1990000000003 {
  name = 'EnsureVisitEventTypeIndex1990000000003';

  async up(queryRunner) {
    if (isPostgresRunner(queryRunner)) {
      await ensureIndex(
        queryRunner,
        'visit_events',
        'IDX_VISIT_EVENT_TYPE',
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_EVENT_TYPE" ON "visit_events" ("event_type")`,
      );
    } else {
      await ensureIndex(
        queryRunner,
        'visit_events',
        'IDX_VISIT_EVENT_TYPE',
        `CREATE INDEX \`IDX_VISIT_EVENT_TYPE\` ON \`visit_events\` (\`event_type\`)`,
      );
    }
  }

  async down(queryRunner) {
    await dropIndexIfExists(
      queryRunner,
      'visit_events',
      'IDX_VISIT_EVENT_TYPE',
    );
  }
}
