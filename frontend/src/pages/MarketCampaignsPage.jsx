import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Search, Plus, ChevronRight, ArrowLeft, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import { CreateMarketCampaignModal, EditCampaignModal } from './markets/MarketCampaignModals'
import * as marketsApi from '../services/api/markets'
import { campaignDetailPath } from '../utils/routes'

function MarketCampaignsPage() {
  const { countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const countryCode = (routeCountry || '').toUpperCase()
  const operatorCode = (routeOperator || '').toUpperCase()

  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const canManageMarkets = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'

  const [market, setMarket] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)

  const load = useCallback(async () => {
    if (!countryCode || !operatorCode) return
    try {
      setLoading(true)
      const [m, list] = await Promise.all([
        marketsApi.getMarket(countryCode, operatorCode),
        marketsApi.listMarketCampaigns(countryCode, operatorCode),
      ])
      setMarket(m)
      setCampaigns(list || [])
    } catch {
      // toast handled
    } finally {
      setLoading(false)
    }
  }, [countryCode, operatorCode])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns
    const q = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.trackingId && c.trackingId.toLowerCase().includes(q)),
    )
  }, [campaigns, search])

  const pageActions = canManageMarkets ? (
    <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
      <Plus className="w-4 h-4" />
      New campaign
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

  if (!market && !loading) {
    return (
      <AppShell>
        <div className="page-container">
          <EmptyState
            title="Market not found"
            description={`No market configured for ${countryCode}-${operatorCode}`}
            action={
              <Button variant="outline" onClick={() => navigate('/markets')}>
                Back to markets
              </Button>
            }
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <div className="page-header">
          <p className="text-xs text-fg-muted mb-1">
            <Link to="/markets" className="hover:text-fg">
              Markets
            </Link>
            {' / '}
            {market?.countryCode} / {market?.operatorCode}
          </p>
          <h1 className="page-header-title">
            {market?.countryName} / {market?.operatorName}
          </h1>
          <p className="page-header-description">
            Campaigns for this country and operator
          </p>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No campaigns found' : 'No campaigns yet'}
              description="Create a campaign under this market to configure pages and subscription flow"
              action={
                canManageMarkets &&
                !search && (
                  <Button variant="primary" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4" />
                    Create campaign
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
                  <th className="col-text">Campaign</th>
                  <th className="col-text">Tracking ID</th>
                  <th className="col-text">Status</th>
                  <th className="col-text">Pages</th>
                  <th className="col-num w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(campaignDetailPath(countryCode, operatorCode, campaign.id))
                    }
                  >
                    <td className="col-text font-medium">{campaign.name}</td>
                    <td className="col-text">
                      <code className="text-xs font-mono text-fg-muted">
                        {campaign.trackingId || '—'}
                      </code>
                    </td>
                    <td className="col-text">
                      <span
                        className={`badge ${campaign.active ? 'badge-success' : 'badge-muted'}`}
                      >
                        {campaign.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="col-text">
                      <span
                        className={`badge ${
                          campaign.requiredComplete ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {campaign.requiredComplete ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="col-num">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
                          title="Edit campaign"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingCampaign(campaign)
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

      <CreateMarketCampaignModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        countryCode={market?.countryCode}
        operatorCode={market?.operatorCode}
        countryName={market?.countryName}
        operatorName={market?.operatorName}
        campaigns={campaigns}
        onCreated={() => load()}
      />

      <EditCampaignModal
        isOpen={Boolean(editingCampaign)}
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onUpdated={(updated) => {
          setCampaigns((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          )
        }}
      />
    </AppShell>
  )
}

export default memo(MarketCampaignsPage)
