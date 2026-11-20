/**
 * Backwards compatibility shim.
 * Functions moved to ./tracking.js
 */
export {
  loadMetrics,
  trackEvent,
  startSession,
  getActiveSessionDuration,
  endSession,
  getUsageSummary,
} from './tracking'
