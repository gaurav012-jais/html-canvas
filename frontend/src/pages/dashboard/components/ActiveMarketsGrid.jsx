import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Globe, ArrowUpRight, ChevronRight } from 'lucide-react'

export function ActiveMarketsGrid({ markets }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          <h2 className="text-base font-bold text-fg">Active Markets</h2>
        </div>
        <Link to="/markets" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
          View All Markets <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {markets.length === 0 ? (
          <div className="col-span-full bg-bg-elevated p-6 rounded-2xl border border-border text-center text-xs text-fg-muted">
            No markets configured yet.
          </div>
        ) : (
          markets.map((market) => {
            const activeCamps = (market.operators || []).reduce(
              (acc, op) => acc + (op.campaigns || []).filter((c) => c.active).length,
              0,
            )
            const totalCamps = (market.operators || []).reduce(
              (acc, op) => acc + (op.campaigns || []).length,
              0,
            )
            const firstOpCode = market.operators?.[0]?.code || ''

            return (
              <Link
                key={`${market.countryCode}-${firstOpCode}`}
                to={`/markets/${market.countryCode}/${firstOpCode}`}
                className="group bg-bg-elevated p-4 rounded-2xl border border-border shadow-xs hover:border-accent/40 hover:-translate-y-1 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{market.flagEmoji || '🌐'}</span>
                      <h3 className="text-sm font-bold text-fg group-hover:text-accent transition-colors">
                        {market.countryName} ({market.countryCode})
                      </h3>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-fg-muted mt-2">
                    Operators: {market.operators?.map((o) => o.name).join(', ') || '—'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Campaigns</span>
                  <span className="font-semibold text-fg">
                    {activeCamps} Active / {totalCamps} Total
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

export default memo(ActiveMarketsGrid)
