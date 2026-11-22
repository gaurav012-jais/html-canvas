import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Search, Plus, ChevronRight, ArrowLeft, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import useStore from '../store/useStore'
import * as marketsApi from '../services/api/markets'
import { campaignDetailPath } from '../utils/routes'
import { CreateMarketCampaignModal, EditCampaignModal } from './markets/MarketCampaignModals'

function MarketCampaignsPage() {
  const { countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const countryCode = (routeCountry || '').toUpperCase()
  const operatorCode = (routeOperator || '').toUpperCase()

  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'

  const [market, setMarket] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)

  const loadData = useCallback(async () => {
    if (!countryCode || !operatorCode) return
    setLoading(true)
    setError(null)
    try {
      const [m, list] = await Promise.all([
        marketsApi.getMarket(countryCode, operatorCode),
        marketsApi.listMarketCampaigns(countryCode, operatorCode),
      ])
      setMarket(m)
      setCampaigns(list || [])
    } catch (err) {
      setError(err.message || 'Failed to load market campaigns')
    } finally {
      setLoading(false)
    }
  }, [countryCode, operatorCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter((c) => {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.trackingId?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
      )
    })
  }, [campaigns, search])

  const activeCount = useMemo(
    () => campaigns.filter((c) => c.active).length,
    [campaigns],
  )

  const handleCreated = (campaign) => {
    setCampaigns((prev) => [campaign, ...prev])
  }

  const handleUpdated = (updated) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    )
  }

  const countryDisplay = market?.countryName || countryCode
  const operatorDisplay = market?.operatorName || operatorCode

  return (
    <AppShell
      actions={
        canCreate && (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            New campaign
          </Button>
        )
      }
    >
      <div className="page-container space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/markets"
              className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All markets
            </Link>
            <span className="text-border-strong text-xs">/</span>
            <span className="text-xs font-mono text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
              {countryCode}
            </span>
            <span className="text-xs font-mono text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
              {operatorCode}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="page-title">
                {countryDisplay} — {operatorDisplay}
              </h1>
              <p className="page-subtitle">
                Campaigns running on {operatorDisplay} ({countryDisplay}).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-fg-muted font-medium bg-bg-surface border border-border rounded-lg px-3 py-2 self-start sm:self-auto">
              <span>
                <strong className="text-fg tabular-nums">{campaigns.length}</strong>{' '}
                {campaigns.length === 1 ? 'campaign' : 'campaigns'}
              </span>
              <span className="text-border-strong">•</span>
              <span className="text-emerald-600 font-semibold">
                <strong className="tabular-nums">{activeCount}</strong> active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns by name or tracking ID..."
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
          <div className="py-16 text-center text-sm text-fg-muted">Loading campaigns...</div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching campaigns' : 'No campaigns in this market'}
            description={
              search
                ? `No campaigns match "${search}". Try another filter.`
                : `Create a campaign to start receiving traffic for ${operatorDisplay} (${countryDisplay}).`
            }
            action={
              canCreate &&
              !search && (
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create campaign
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => {
              const detailUrl = campaignDetailPath(countryCode, operatorCode, c.id)
              return (
                <div
                  key={c.id}
                  className="group relative bg-bg-surface border border-border hover:border-primary/50 rounded-xl p-4 transition-all hover:shadow-xs flex items-center justify-between gap-3 cursor-pointer"
                  onClick={() => navigate(detailUrl)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-fg text-sm truncate">{c.name}</span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          c.active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-bg-subtle text-fg-muted'
                        }`}
                      >
                        {c.active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-fg-muted font-mono">
                      <span>{c.trackingId || `#${c.id}`}</span>
                      {c.verificationMode && (
                        <>
                          <span className="text-border-strong font-sans">•</span>
                          <span className="font-sans text-[11px] uppercase">
                            {c.verificationMode.replace(/_/g, ' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canCreate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCampaign(c)
                        }}
                        className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
                        title="Edit campaign name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateMarketCampaignModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        countryCode={countryCode}
        operatorCode={operatorCode}
        countryName={countryDisplay}
        operatorName={operatorDisplay}
        campaigns={campaigns}
        onCreated={handleCreated}
      />

      <EditCampaignModal
        isOpen={Boolean(editingCampaign)}
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onUpdated={handleUpdated}
      />
    </AppShell>
  )
}

export default memo(MarketCampaignsPage)
