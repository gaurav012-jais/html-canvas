/**
 * Delayed Checksub Worker (Facade)
 *
 * Runs as a cron job every 1 minute.
 * Processes conversion_postbacks with delayed_checksub_status = 'pending'
 * whose delayed_checksub_scheduled_at has elapsed, calling provider checksub
 * and updating the postback row with the partner's response.
 */

export { classifyChecksubStatus } from './checksub-worker/checksub-status.util.js';
export { processRow } from './checksub-worker/checksub-processor.js';
export {
  runTick,
  startDelayedChecksubWorker,
  stopDelayedChecksubWorker,
  scheduleDelayedChecksub,
  runDelayedChecksubNow,
} from './checksub-worker/checksub-scheduler.js';
