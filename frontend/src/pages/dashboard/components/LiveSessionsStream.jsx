import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, ArrowUpRight, ChevronRight } from 'lucide-react'
import { formatDate } from '../../../utils/date'
import { getEventTypeBadgeClass, getStatusBadgeClass } from '../dashboardConstants'

export function LiveSessionsStream({ recentLogs, buildAnalyticsUrl }) {
  const navigate = useNavigate()

  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold text-fg">Live Sessions Stream</h2>
        </div>
        <Link
          to={buildAnalyticsUrl()}
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
        >
          View All Logs <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-subtle border-b border-border text-fg-muted font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3">Visit ID</th>
              <th className="px-5 py-3">Country / Op</th>
              <th className="px-5 py-3">Latest Event</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-fg-muted">
                  No recent session logs recorded.
                </td>
              </tr>
            ) : (
              recentLogs.map((log) => (
                <tr
                  key={log.visitId}
                  onClick={() => navigate(`/analytics/visits/${log.visitId}`)}
                  className="hover:bg-bg-subtle/70 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3 font-mono font-bold text-fg group-hover:text-accent">
                    #{log.visitId}
                  </td>
                  <td className="px-5 py-3 text-fg-muted">
                    {log.country || '—'} / {log.operator || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${getEventTypeBadgeClass(
                        log.eventType,
                      )}`}
                    >
                      {log.eventType || 'VISIT'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusBadgeClass(
                        log.status,
                      )}`}
                    >
                      {log.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{formatDate(log.timestamp)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-accent font-semibold flex items-center justify-end gap-1 group-hover:underline">
                      Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(LiveSessionsStream)
