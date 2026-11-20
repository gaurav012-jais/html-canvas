/**
 * DashboardPage Entrypoint
 * Re-exports the modularized DashboardPage and helpers for backward compatibility.
 */
import DashboardPage from './dashboard/DashboardPage'

export {
  DASHBOARD_DATE_PRESETS,
  EVENT_COLOR_MAP,
  FUNNEL_FROM_STATS,
  operatorBarColor,
  getEventTypeBadgeClass,
  getOperatorStatusBadgeClass,
  getStatusBadgeClass,
  CustomTooltip,
} from './dashboard/dashboardConstants'

export { DashboardPage }
export default DashboardPage
