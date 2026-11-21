import * as fs from 'fs/promises';
import * as path from 'path';
import { getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { VisitEvent } from '../../../database/entities/visit-event.entity.js';
import getConfig from '../../../config/configuration.js';

const getVisitRepo = () => getRepository(Visit);
const getVisitEventRepo = () => getRepository(VisitEvent);

export const archiveOldData = async () => {
  const config = getConfig();
  const retentionDays = config.archiveRetentionDays || 30;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

  const archivesDir = path.join(process.cwd(), 'archives');
  try {
    await fs.mkdir(archivesDir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create archives directory: ${err.message}`);
    return;
  }

  const timestampStr = new Date().toISOString().split('T')[0];
  const eventsFile = path.join(
    archivesDir,
    `visit_events_${timestampStr}.jsonl`,
  );
  const visitsFile = path.join(archivesDir, `visits_${timestampStr}.jsonl`);

  let eventsArchived = 0;
  let visitsArchived = 0;

  try {
    const qbEvents = getVisitEventRepo()
      .createQueryBuilder('ve')
      .where('ve.createdAt < :date', { date: thresholdDate });

    const oldEvents = await qbEvents.getMany();
    if (oldEvents.length > 0) {
      const lines = oldEvents.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.appendFile(eventsFile, lines, 'utf8');
      eventsArchived = oldEvents.length;

      const ids = oldEvents.map((e) => e.id);
      for (let i = 0; i < ids.length; i += 1000) {
        const batch = ids.slice(i, i + 1000);
        await getVisitEventRepo().delete(batch);
      }
    }
  } catch (err) {
    console.error(`Error archiving visit events: ${err.message}`);
  }

  try {
    const qbVisits = getVisitRepo()
      .createQueryBuilder('v')
      .where('v.createdAt < :date', { date: thresholdDate });

    const oldVisits = await qbVisits.getMany();
    if (oldVisits.length > 0) {
      const lines = oldVisits.map((v) => JSON.stringify(v)).join('\n') + '\n';
      await fs.appendFile(visitsFile, lines, 'utf8');
      visitsArchived = oldVisits.length;

      const ids = oldVisits.map((v) => v.id);
      for (let i = 0; i < ids.length; i += 1000) {
        const batch = ids.slice(i, i + 1000);
        await getVisitRepo().delete(batch);
      }
    }
  } catch (err) {
    console.error(`Error archiving visits: ${err.message}`);
  }
};

export const createAnalyticsArchiveService = () => ({
  archiveOldData,
});

export const analyticsArchiveService = createAnalyticsArchiveService();
