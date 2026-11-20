import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { operatorBarColor, getOperatorStatusBadgeClass } from '../dashboardConstants'

export function OperatorCallbacksCard({
  loading,
  callbacksReceived,
  operatorStatusBreakdown,
}) {
  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-emerald-500 rounded-full" />
            <h2 className="text-sm font-bold text-fg">Operator HTTP callbacks</h2>
          </div>
          <p className="text-[11px] text-fg-muted mt-1">
            Telco webhook hits in this date range — not visit-log CALLBACK_RECEIVED rows
          </p>
        </div>
        <Link
          to="/postbacks"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
        >
          Open postbacks <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="p-5">
        <p className="text-2xl font-black text-fg tracking-tight">
          {loading ? '...' : callbacksReceived.toLocaleString()}
        </p>
        <p className="text-[11px] text-fg-muted mt-1 mb-4">
          Mix of operator statuses (active, grace, parking, …)
        </p>
        {loading ? (
          <p className="text-xs text-fg-muted animate-pulse">Loading callback mix…</p>
        ) : operatorStatusBreakdown.length === 0 ? (
          <p className="text-xs text-fg-muted">No operator callbacks in this window.</p>
        ) : (
          <div className="space-y-2.5">
            {operatorStatusBreakdown.map((row) => {
              const pct =
                callbacksReceived > 0
                  ? ((Number(row.count) / callbacksReceived) * 100).toFixed(1)
                  : 0
              const barColor = operatorBarColor(row.status)
              return (
                <Link
                  key={row.status}
                  to={`/postbacks?operatorStatus=${encodeURIComponent(row.status)}`}
                  className="block group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wide ${getOperatorStatusBadgeClass(
                        row.status,
                      )}`}
                    >
                      {row.status}
                    </span>
                    <span className="font-mono text-fg-muted group-hover:text-accent">
                      {Number(row.count).toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-bg-muted h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(4, pct))}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(OperatorCallbacksCard)
