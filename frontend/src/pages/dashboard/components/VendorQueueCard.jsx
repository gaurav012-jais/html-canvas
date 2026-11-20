import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export function VendorQueueCard({ loading, postbackStats, totalPostbacks }) {
  const cards = [
    {
      label: 'Created',
      value: postbackStats?.postbacksCreated ?? totalPostbacks,
      hint: 'All queue rows',
      status: 'all',
    },
    {
      label: 'Pending',
      value: postbackStats?.pending ?? 0,
      hint: 'Waiting on operator',
      status: 'pending',
    },
    {
      label: 'Matched',
      value: postbackStats?.received ?? 0,
      hint: 'Callback matched, not fired',
      status: 'received',
    },
    {
      label: 'Sent to vendor',
      value: postbackStats?.sent ?? 0,
      hint: 'CPA URL fired',
      status: 'sent',
    },
    {
      label: 'Failed',
      value: postbackStats?.failed ?? 0,
      hint: 'Vendor fire error',
      status: 'failed',
    },
    {
      label: 'Skipped',
      value: postbackStats?.skipped ?? 0,
      hint: 'Not fired',
      status: 'skipped',
    },
  ]

  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-indigo-500 rounded-full" />
            <h2 className="text-sm font-bold text-fg">Vendor fire queue</h2>
          </div>
          <p className="text-[11px] text-fg-muted mt-1">
            Each conversion row has one status. Created is the total; the rest do not add up with HTTP callbacks.
          </p>
        </div>
        <Link
          to="/postbacks"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
        >
          View queue <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.status === 'all' ? '/postbacks' : `/postbacks?status=${card.status}`}
            className="rounded-xl border border-border bg-bg-subtle/40 p-3 hover:border-accent/40 transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              {card.label}
            </p>
            <p className="text-xl font-black text-fg mt-1 tabular-nums">
              {loading ? '…' : Number(card.value || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-fg-muted mt-1">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default memo(VendorQueueCard)
