/**
 * SessionDetailPage Entrypoint
 * Re-exports the modularized SessionDetailPage and helpers for backward compatibility.
 */
import SessionDetailPage from './sessionDetail/SessionDetailPage'

export {
  getEventIcon,
  statusClass,
  eventPack,
  parseJsonish,
  billingSkipFromPayload,
  eventChip,
  eventDescription,
  getRequestPayload,
  categorizeTimelineItem,
} from './sessionDetail/sessionDetailHelpers'

export { SessionDetailPage }
export default SessionDetailPage
