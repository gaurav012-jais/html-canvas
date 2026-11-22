import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Globe, ArrowUpRight, ChevronRight } from 'lucide-react'

export function ActiveMarketsGrid({ markets = [], campaigns = [] }) {
  const groupedMarkets = useMemo(() => {
    // If already grouped by country with operators array
    if (markets.length > 0 && Array.isArray(markets[0]?.operators)) {
      return markets
    }
    const map = new Map()
    for (const m of markets) {
      const cCode = String(m.countryCode || '').trim().toUpperCase()
      if (!cCode) continue
      if (!map.has(cCode)) {
        map.set(cCode, {
          countryCode: cCode,
          countryName: m.countryName || cCode,
          flagEmoji: m.flagEmoji || '🌐',
          operators: [],
          operatorIds: new Set(),
          totalCampaigns: 0,
        })
      }
      const entry = map.get(cCode)
      entry.operators.push({
        id: m.operatorId,
        code: m.operatorCode,
        name: m.operatorName || m.operatorCode,
        campaignCount: m.campaignCount || 0,
      })
      if (m.operatorId != null) {
        entry.operatorIds.add(m.operatorId)
      }
      entry.totalCampaigns += Number(m.campaignCount) || 0
    }
    return Array.from(map.values()).sort((a, b) =>
      a.countryName.localeCompare(b.countryName),
    )
  }, [markets])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          <h2 className="text-base font-bold text-fg">Active Markets</h2>
        </div>
        <Link
          to="/markets"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
        >
          View All Markets <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groupedMarkets.length === 0 ? (
          <div className="col-span-full bg-bg-elevated p-6 rounded-2xl border border-border text-center text-xs text-fg-muted">
            No markets configured yet.
          </div>
        ) : (
          groupedMarkets.map((group) => {
            const countryCampaigns = campaigns.filter((c) => {
              const cCode = (c.countryCode || c.country || '').trim().toUpperCase()
              if (cCode === group.countryCode) return true
              if (c.operatorId != null && group.operatorIds?.has(c.operatorId)) return true
              return false
            })
            const activeCamps = countryCampaigns.filter((c) => c.active).length
            const totalCamps =
              countryCampaigns.length > 0 ? countryCampaigns.length : group.totalCampaigns
            const firstOpCode = group.operators?.[0]?.code || ''
            const to = firstOpCode
              ? `/markets/${group.countryCode}/${firstOpCode}`
              : `/markets`

            return (
              <Link
                key={group.countryCode}
                to={to}
                className="group bg-bg-elevated p-4 rounded-2xl border border-border shadow-xs hover:border-accent/40 hover:-translate-y-1 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.flagEmoji || '🌐'}</span>
                      <h3 className="text-sm font-bold text-fg group-hover:text-accent transition-colors">
                        {group.countryName} ({group.countryCode})
                      </h3>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-fg-muted mt-2">
                    Operators: {group.operators?.map((o) => o.name).join(', ') || '—'}
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
