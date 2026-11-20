/**
 * CampaignLogsPage Entrypoint
 * Re-exports the modularized CampaignLogsPage and flow helpers for backward compatibility.
 */
import CampaignLogsPage from './campaignLogs/CampaignLogsPage'

export {
  FLOW_SPECS,
  isForeignFlowEvent,
  COMPARE_PRESETS,
  eventLabel,
  statusLabel,
  seriesColor,
  STANDARD_EVENT_TYPES,
  resolveInterval,
  getEventBadgeClass,
  getStatusBadgeClass,
} from './campaignLogs/logConstants'

export { CampaignLogsPage }
export default CampaignLogsPage
