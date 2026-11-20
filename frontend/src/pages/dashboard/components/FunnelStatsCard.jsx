import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'

export function FunnelStatsCard({
  loading,
  funnelBreakdown,
  totalVisits,
  buildAnalyticsUrl,
}) {
  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-emerald-500 rounded-full" />
            <h2 className="text-sm font-bold text-fg">Funnel from stats</h2>
          </div>
          <p className="text-[11px] text-fg-muted mt-1">Today live · older days dumped</p>
        </div>
        <span className="text-[11px] text-fg-muted">Click to filter</span>
      </div>

      <div className="p-5 flex-1 space-y-3">
        {loading ? (
          <div className="h-[260px] flex items-center justify-center text-xs text-fg-muted animate-pulse">
            Loading events...
          </div>
        ) : funnelBreakdown.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center">
            <Activity className="w-8 h-8 text-fg-muted/40 mb-2" />
            <p className="text-xs text-fg-muted">No events logged in this window.</p>
          </div>
        ) : (
          funnelBreakdown.map((item) => {
            const percentage = totalVisits > 0 ? ((item.count / totalVisits) * 100).toFixed(1) : 0
            const color = item.color || '#64748b'

            return (
              <Link
                key={item.key}
                to={buildAnalyticsUrl({ eventType: item.key })}
                className="group block p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-bg-subtle transition-all"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-fg truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-mono text-fg-muted group-hover:text-accent transition-colors">
                    {item.count.toLocaleString()}
                    {item.key === 'VISIT' ? '' : ` (${percentage}% of visits)`}
                  </span>
                </div>
                <div className="w-full bg-bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, percentage))}%`, backgroundColor: color }}
                  />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

export default memo(FunnelStatsCard)
