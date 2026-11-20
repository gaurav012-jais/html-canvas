/**
 * Delayed Checksub Scheduler & Worker Lifecycle
 */

import { LessThanOrEqual } from 'typeorm';
import { CronJob } from 'cron';
import { getRepository } from '../../../database/index.js';
import { ConversionPostback } from '../../../database/entities/conversion-postback.entity.js';
import { BATCH_LIMIT, LOG_PREFIX } from './checksub-status.util.js';
import { processRow } from './checksub-processor.js';

let jobs = [];

/**
 * Main tick handler — fetch up to BATCH_LIMIT due pending rows and
 * process them sequentially to avoid hammering the partner API.
 */
export const runTick = async () => {
  try {
    const repo = getRepository(ConversionPostback);

    // 1. Fetch scheduled pending rows that are due
    let rowsToProcess = await repo.find({
      where: {
        delayedChecksubStatus: 'pending',
        delayedChecksubScheduledAt: LessThanOrEqual(new Date()),
      },
      order: { delayedChecksubScheduledAt: 'ASC' },
      take: BATCH_LIMIT,
      select: ['id', 'msisdn', 'campaignId', 'operatorStatus', 'delayedChecksubStatus'],
    });

    // 2. Also backfill uninitialized rows whose 30 minutes have passed
    if (rowsToProcess.length < BATCH_LIMIT) {
      const remaining = BATCH_LIMIT - rowsToProcess.length;
      const uninit = await repo
        .createQueryBuilder('p')
        .where('p.delayedChecksubStatus IS NULL')
        .andWhere('p.msisdn IS NOT NULL')
        .andWhere("p.msisdn <> ''")
        .andWhere('p.createdAt <= :thirtyMinsAgo', {
          thirtyMinsAgo: new Date(Date.now() - 30 * 60 * 1000),
        })
        .orderBy('p.createdAt', 'DESC')
        .take(remaining)
        .select(['p.id', 'p.msisdn', 'p.campaignId', 'p.operatorStatus', 'p.delayedChecksubStatus'])
        .getMany();

      if (uninit.length) {
        rowsToProcess = rowsToProcess.concat(uninit);
      }
    }

    if (rowsToProcess.length === 0) return;

    console.log(`${LOG_PREFIX} Tick: found ${rowsToProcess.length} row(s) to process.`);

    // Sequential processing — avoids burst on partner APIs
    for (const row of rowsToProcess) {
      await processRow(row);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Tick error:`, err.message);
  }
};

/**
 * Start the delayed checksub cron worker (every 1 minute).
 * @returns {CronJob[]} running job array
 */
export const startDelayedChecksubWorker = () => {
  if (jobs.length > 0) return jobs;

  const job = CronJob.from({
    cronTime: '* * * * *', // every 1 minute
    timeZone: 'Asia/Kolkata',
    start: true,
    onTick: runTick,
  });

  jobs = [job];
  console.log(`${LOG_PREFIX} Worker started (every 1 minute).`);
  return jobs;
};

/**
 * Stop all running delayed checksub cron jobs.
 */
export const stopDelayedChecksubWorker = () => {
  for (const job of jobs) {
    job.stop();
  }
  jobs = [];
  console.log(`${LOG_PREFIX} Worker stopped.`);
};

/**
 * Schedule a delayed checksub on a postback row.
 * Called at OTP-verify time to set up the 30-minute deferred checksub.
 *
 * @param {object} opts
 * @param {number|string} [opts.postbackId]      - ConversionPostback PK (preferred)
 * @param {string}        [opts.msisdn]           - fallback lookup if postbackId absent
 * @param {number|string} [opts.campaignId]       - used with msisdn lookup
 * @param {number}        [opts.delayMinutes=30]  - delay in minutes (default 30)
 * @returns {Promise<ConversionPostback|null>}    - updated postback or null if not found
 */
export const scheduleDelayedChecksub = async ({
  postbackId,
  msisdn,
  campaignId,
  delayMinutes = 30,
} = {}) => {
  try {
    const repo = getRepository(ConversionPostback);

    let postback = null;

    if (postbackId) {
      postback = await repo.findOne({ where: { id: parseInt(postbackId, 10) } });
    } else if (msisdn && campaignId) {
      postback = await repo.findOne({
        where: { msisdn: String(msisdn), campaignId: parseInt(campaignId, 10) },
        order: { id: 'DESC' },
      });
    }

    if (!postback) {
      console.warn(
        `${LOG_PREFIX} scheduleDelayedChecksub: postback not found (postbackId=${postbackId}, msisdn=${msisdn}).`,
      );
      return null;
    }

    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await repo.update(
      { id: postback.id },
      {
        delayedChecksubStatus: 'pending',
        delayedChecksubScheduledAt: scheduledAt,
      },
    );

    console.log(
      `${LOG_PREFIX} Scheduled checksub for postback id=${postback.id} msisdn=${postback.msisdn} at ${scheduledAt.toISOString()} (+${delayMinutes}m).`,
    );

    return { ...postback, delayedChecksubStatus: 'pending', delayedChecksubScheduledAt: scheduledAt };
  } catch (err) {
    console.error(`${LOG_PREFIX} scheduleDelayedChecksub error:`, err.message);
    return null;
  }
};

/**
 * Trigger immediate checksub on a specific postback (e.g. from UI 'Run Now' button).
 */
export const runDelayedChecksubNow = async (postbackId) => {
  try {
    const repo = getRepository(ConversionPostback);
    const row = await repo.findOne({ where: { id: parseInt(postbackId, 10) } });
    if (!row) {
      return { error: 'Postback not found' };
    }
    await processRow(row, { force: true });
    const updated = await repo.findOne({ where: { id: parseInt(postbackId, 10) } });
    return {
      success: updated?.delayedChecksubStatus === 'completed',
      outcome: updated?.delayedChecksubOutcome,
      status: updated?.delayedChecksubStatus,
      operatorStatus: updated?.operatorStatus,
      executedAt: updated?.delayedChecksubExecutedAt,
    };
  } catch (err) {
    console.error(`${LOG_PREFIX} runDelayedChecksubNow error:`, err.message);
    return { error: err.message };
  }
};
