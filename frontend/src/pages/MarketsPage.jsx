import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, Globe, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import useStore from '../store/useStore'
import * as marketsApi from '../services/api/markets'
import { CreateMarketModal, EditMarketModal } from './markets/MarketModals'
import { MarketCard } from './markets/MarketCard'

function MarketsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManageMarkets = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const addToast = useStore((s) => s.addToast)

  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingMarket, setEditingMarket] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mkts] = await Promise.all([
        marketsApi.listMarkets(),
        fetchCampaigns().catch(() => []),
      ])
      setMarkets(mkts || [])
    } catch (err) {
      setError(err.message || 'Failed to load markets')
    } finally {
      setLoading(false)
    }
  }, [fetchCampaigns])

  useEffect(() => {
    loadData()
  }, [loadData])

  const countsByKey = useMemo(() => {
    const map = new Map()
    for (const c of campaigns || []) {
      const cc = (c.country || '').trim().toUpperCase()
      const op = (c.operator || '').trim().toUpperCase()
      if (!cc || !op) continue
      const k = `${cc}:${op}`
      const cur = map.get(k) || { total: 0, active: 0 }
      cur.total += 1
      if (c.active) cur.active += 1
      map.set(k, cur)
    }
    return map
  }, [campaigns])

  const rows = useMemo(() => {
    return markets.map((m) => {
      const k = `${(m.countryCode || '').toUpperCase()}:${(m.operatorCode || '').toUpperCase()}`
      const c = countsByKey.get(k) || { total: 0, active: 0 }
      return {
        ...m,
        campaignCount: c.total,
        activeCampaignCount: c.active,
      }
    })
  }, [markets, countsByKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((m) => {
      return (
        m.countryName?.toLowerCase().includes(q) ||
        m.countryCode?.toLowerCase().includes(q) ||
        m.operatorName?.toLowerCase().includes(q) ||
        m.operatorCode?.toLowerCase().includes(q)
      )
    })
  }, [rows, search])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const m of filtered) {
      const cc = m.countryCode || 'OTHER'
      if (!map.has(cc)) {
        map.set(cc, {
          countryCode: cc,
          countryName: m.countryName || cc,
          markets: [],
        })
      }
      map.get(cc).markets.push(m)
    }
    return Array.from(map.values()).sort((a, b) => a.countryName.localeCompare(b.countryName))
  }, [filtered])

  const totalCampaigns = useMemo(
    () => rows.reduce((acc, r) => acc + r.campaignCount, 0),
    [rows],
  )
  const activeCampaigns = useMemo(
    () => rows.reduce((acc, r) => acc + r.activeCampaignCount, 0),
    [rows],
  )

  const handleCreated = (market) => {
    setMarkets((prev) => {
      const exists = prev.some(
        (m) =>
          m.countryCode === market.countryCode && m.operatorCode === market.operatorCode,
      )
      return exists ? prev : [...prev, market]
    })
  }

  const handleUpdated = (updated) => {
    setMarkets((prev) =>
      prev.map((m) =>
        m.countryCode === updated.countryCode && m.operatorCode === updated.operatorCode
          ? { ...m, ...updated }
          : m,
      ),
    )
  }

  return (
    <AppShell
      actions={
        canManageMarkets && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            New market
          </Button>
        )
      }
    >
      <div className="page-container space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Markets</h1>
            <p className="page-subtitle">
              Browse campaigns organized by country and mobile operator.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-fg-muted font-medium bg-bg-surface border border-border rounded-lg px-3 py-2 self-start sm:self-auto">
            <span>
              <strong className="text-fg tabular-nums">{markets.length}</strong>{' '}
              {markets.length === 1 ? 'market' : 'markets'}
            </span>
            <span className="text-border-strong">•</span>
            <span>
              <strong className="text-fg tabular-nums">{totalCampaigns}</strong>{' '}
              {totalCampaigns === 1 ? 'campaign' : 'campaigns'}
            </span>
            <span className="text-border-strong">•</span>
            <span className="text-emerald-600 font-semibold">
              <strong className="tabular-nums">{activeCampaigns}</strong> active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by country, operator, or code..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-fg-muted hover:text-fg font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-fg-muted">Loading markets...</div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Globe}
            title={search ? 'No matching markets' : 'No markets yet'}
            description={
              search
                ? `No markets match "${search}". Try another filter.`
                : 'Markets group campaigns by country and carrier operator.'
            }
            action={
              canManageMarkets &&
              !search && (
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create first market
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.countryCode} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {group.countryName}
                  </h2>
                  <span className="text-[11px] font-mono font-medium text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                    {group.countryCode}
                  </span>
                  <span className="text-xs text-fg-muted">
                    ({group.markets.length} {group.markets.length === 1 ? 'operator' : 'operators'})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.markets.map((m) => (
                    <MarketCard
                      key={`${m.countryCode}-${m.operatorCode}`}
                      market={m}
                      canManageMarkets={canManageMarkets}
                      onEdit={setEditingMarket}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateMarketModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <EditMarketModal
        isOpen={Boolean(editingMarket)}
        market={editingMarket}
        onClose={() => setEditingMarket(null)}
        onUpdated={handleUpdated}
      />
    </AppShell>
  )
}

export default memo(MarketsPage)
