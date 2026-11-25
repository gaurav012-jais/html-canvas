import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, Globe, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import { CreateMarketModal, EditMarketModal } from './markets/MarketModals'
import * as marketsApi from '../services/api/markets'
import useStore from '../store/useStore'

function MarketsPage() {
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const { user, loading: authLoading } = useAuth()
  const canManageMarkets = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'

  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingMarket, setEditingMarket] = useState(null)

  const loadMarkets = useCallback(async () => {
    try {
      setLoading(true)
      const data = await marketsApi.listMarkets()
      setMarkets(data || [])
    } catch (err) {
      addToast(err.message || 'Failed to load markets', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      if (active) loadMarkets()
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [loadMarkets])

  const filtered = useMemo(() => {
    if (!search.trim()) return markets
    const q = search.toLowerCase()
    return markets.filter(
      (m) =>
        m.countryName.toLowerCase().includes(q) ||
        m.countryCode.toLowerCase().includes(q) ||
        m.operatorName.toLowerCase().includes(q) ||
        m.operatorCode.toLowerCase().includes(q),
    )
  }, [markets, search])

  const pageActions = canManageMarkets ? (
    <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
      <Plus className="w-4 h-4" />
      New market
    </Button>
  ) : null

  if (authLoading) {
    return (
      <AppShell>
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted text-sm">Loading...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">Markets</h1>
          <p className="page-header-description">
            Browse countries and operators, then manage campaigns under each market
          </p>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search by country or operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">Loading markets...</div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No markets found' : 'No markets yet'}
              description="Create a country + operator pair to start adding campaigns"
              action={
                canManageMarkets &&
                !search && (
                  <Button variant="primary" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4" />
                    Create market
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-text">Country</th>
                  <th className="col-text">Operator</th>
                  <th className="col-text">Codes</th>
                  <th className="col-num">Campaigns</th>
                  <th className="col-num w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((market) => (
                  <tr
                    key={`${market.countryCode}-${market.operatorCode}`}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/markets/${market.countryCode}/${market.operatorCode}`)
                    }
                  >
                    <td className="col-text font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-fg-subtle" />
                        {market.countryName}
                      </span>
                    </td>
                    <td className="col-text">{market.operatorName}</td>
                    <td className="col-text">
                      <code className="text-xs font-mono text-fg-muted">
                        {market.countryCode}-{market.operatorCode}
                      </code>
                    </td>
                    <td className="col-num text-fg-muted">{market.campaignCount}</td>
                    <td className="col-num">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
                          title="Edit market"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingMarket(market)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-fg-subtle" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateMarketModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(market) => {
          loadMarkets()
          if (market?.countryCode && market?.operatorCode) {
            navigate(`/markets/${market.countryCode}/${market.operatorCode}`)
          }
        }}
      />

      <EditMarketModal
        isOpen={Boolean(editingMarket)}
        market={editingMarket}
        onClose={() => setEditingMarket(null)}
        onUpdated={() => loadMarkets()}
      />
    </AppShell>
  )
}

export default memo(MarketsPage)
