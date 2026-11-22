import { ChevronRight, Pencil } from 'lucide-react'

export function MarketCard({ market, canManageMarkets, onEdit, onNavigate }) {
  const m = market
  const marketUrl = `/markets/${encodeURIComponent(m.countryCode)}/${encodeURIComponent(m.operatorCode)}`
  return (
    <div
      className="group relative bg-bg-surface border border-border hover:border-primary/50 rounded-xl p-4 transition-all hover:shadow-xs flex items-center justify-between gap-3 cursor-pointer"
      onClick={() => onNavigate(marketUrl)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-fg text-sm truncate">
            {m.operatorName}
          </span>
          <span className="text-[10px] font-mono text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
            {m.operatorCode}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span>
            <strong className="text-fg tabular-nums">{m.campaignCount}</strong>{' '}
            {m.campaignCount === 1 ? 'campaign' : 'campaigns'}
          </span>
          {m.activeCampaignCount > 0 && (
            <>
              <span className="text-border-strong">•</span>
              <span className="text-emerald-600 font-medium">
                {m.activeCampaignCount} active
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {canManageMarkets && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(m)
            }}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
            title="Edit market"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  )
}
