import { memo, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ExternalLink,
  Settings,
  FileText,
  Store,
} from 'lucide-react'
import useStore from '../../store/useStore'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import { copyToClipboard } from '../../utils/clipboard'
import { marketPath, resolveMarketCodes } from '../../utils/routes'
import { getCampaignPreviewUrl } from '../../services/api/campaigns'
import CampaignApiConfigModal from '../../components/dashboard/CampaignApiConfigModal'
import { DEFAULT_TIMEZONE } from '../../utils/date'
import CampaignFlowBuilder from '../../components/flow/CampaignFlowBuilder'
import { resolveCampaignDetailFlow } from './flows'
import VendorStatsSection from './VendorStatsSection'
import VendorAssignModal from './VendorAssignModal'
import CampaignHeader from './CampaignHeader'
import { useCampaignTracking } from './hooks/useCampaignTracking'
import { useCampaignVendorRows } from './hooks/useCampaignVendorRows'

function CampaignDetailPage() {
  const { id, countryCode: routeCountry, operatorCode: routeOperator } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaign)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const loadCampaign = useStore((s) => s.loadCampaign)
  const updateCampaign = useStore((s) => s.updateCampaign)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [activating, setActivating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const addToast = useStore((s) => s.addToast)

  const {
    assigningVendor,
    selectedVendorForAdd,
    setSelectedVendorForAdd,
    addPayoutPercent,
    setAddPayoutPercent,
    addAllowedStatuses,
    setAddAllowedStatuses,
    handleSubmitTracking,
    handleRemoveTracking,
    handleToggleTrackingActive,
    handleSavePayoutPercent,
    handleSaveTrackingStatuses,
    handleSaveVendorCapping,
  } = useCampaignTracking({ campaign, vendors, updateCampaign })

  const {
    vendorPreset,
    vendorCustomRange,
    setVendorCustomRange,
    vendorStatsLoading,
    vendorRows,
    vendorTrackings,
    activeVendors,
    handleVendorPresetChange,
    handleVendorCustomDateApply,
    loadVendorStats,
  } = useCampaignVendorRows({ id, campaign, vendors, timezone, addToast })

  useEffect(() => {
    fetchVendors().catch(() => {})
  }, [fetchVendors])

  useEffect(() => {
    const timer = setTimeout(() => {
      setNameDraft(campaign?.name || '')
      setEditingName(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [campaign?.id, campaign?.name])

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id, loadCampaign])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#flow') return
    const el = document.getElementById('flow')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [campaign?.id])

  const handleSaveName = async () => {
    if (!campaign || !nameDraft.trim()) return
    setSavingName(true)
    try {
      await updateCampaign(campaign.id, { name: nameDraft.trim() })
      useStore.getState().addToast('Campaign name updated', 'success')
      setEditingName(false)
    } catch {
      // toast in slice
    } finally {
      setSavingName(false)
    }
  }

  const copyTracking = (url, copyKey) => {
    copyToClipboard(url).then((success) => {
      if (success) {
        setCopiedId(copyKey)
        setTimeout(() => setCopiedId(null), 2000)
        useStore.getState().addToast('Copied', 'success')
      } else {
        useStore.getState().addToast('Failed to copy', 'error')
      }
    })
  }

  const handleToggleActive = async () => {
    if (!campaign) return
    const next = !campaign.active
    setActivating(true)
    try {
      await updateCampaign(campaign.id, { active: next })
      useStore.getState().addToast(`Campaign ${next ? 'activated' : 'paused'}`, 'success')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted text-sm">Loading campaign...</p>
        </div>
      </AppShell>
    )
  }

  if (error || !campaign) {
    return (
      <AppShell>
        <div className="page-container text-center py-12">
          <p className="text-fg-muted mb-4">{error || 'Campaign not found'}</p>
          <Button variant="outline" onClick={() => navigate('/markets')}>
            Back to markets
          </Button>
        </div>
      </AppShell>
    )
  }

  const previewUrl = getCampaignPreviewUrl(campaign)
  const { countryCode, operatorCode } = resolveMarketCodes(
    { countryCode: routeCountry, operatorCode: routeOperator },
    campaign,
  )
  const backToMarket = marketPath(countryCode, operatorCode)
  const canActivate = campaign.requiredComplete
  const activateBlockedReason =
    !campaign.active && !canActivate
      ? 'Complete the pages required by this flow first'
      : null
  const trackings = vendorTrackings
  const flow = resolveCampaignDetailFlow(campaign)

  const pageActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowVendorModal(true)}>
        <Store className="w-4 h-4" />
        Vendors
        {trackings.length > 0 && (
          <span className="ml-0.5 tabular-nums text-fg-muted">({trackings.length})</span>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowApiConfig(true)}>
        <Settings className="w-4 h-4" />
        API
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/analytics?campaignId=${campaign.id}`)}
      >
        <FileText className="w-4 h-4" />
        Logs
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(previewUrl, '_blank')}
        title="Open live funnel preview"
      >
        <ExternalLink className="w-4 h-4" />
        Preview
      </Button>
    </>
  )

  return (
    <AppShell actions={pageActions}>
      <div className="page-container">
        <CampaignHeader
          campaign={campaign}
          backToMarket={backToMarket}
          onNavigateBack={() => navigate(backToMarket)}
          editingName={editingName}
          setEditingName={setEditingName}
          nameDraft={nameDraft}
          setNameDraft={setNameDraft}
          savingName={savingName}
          onSaveName={handleSaveName}
          canActivate={canActivate}
          activating={activating}
          activateBlockedReason={activateBlockedReason}
          onToggleActive={handleToggleActive}
        />

        <div id="flow" className="scroll-mt-4">
          <CampaignFlowBuilder
            campaignId={campaign.id}
            countryCode={countryCode}
            operatorCode={operatorCode}
            embedded
          />
        </div>

        <VendorStatsSection
          flow={flow}
          vendorRows={vendorRows}
          vendorStatsLoading={vendorStatsLoading}
          vendorPreset={vendorPreset}
          vendorCustomRange={vendorCustomRange}
          setVendorCustomRange={setVendorCustomRange}
          onPresetChange={handleVendorPresetChange}
          onCustomDateApply={handleVendorCustomDateApply}
          onRefresh={loadVendorStats}
          onManageVendors={() => setShowVendorModal(true)}
        />
      </div>

      <VendorAssignModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        flow={flow}
        campaign={campaign}
        vendors={vendors}
        activeVendors={activeVendors}
        trackings={trackings}
        assigningVendor={assigningVendor}
        selectedVendorForAdd={selectedVendorForAdd}
        setSelectedVendorForAdd={setSelectedVendorForAdd}
        addPayoutPercent={addPayoutPercent}
        setAddPayoutPercent={setAddPayoutPercent}
        addAllowedStatuses={addAllowedStatuses}
        setAddAllowedStatuses={setAddAllowedStatuses}
        copiedId={copiedId}
        onCopyTracking={copyTracking}
        onSubmitTracking={handleSubmitTracking}
        onRemoveTracking={handleRemoveTracking}
        onToggleTrackingActive={handleToggleTrackingActive}
        onSavePayoutPercent={handleSavePayoutPercent}
        onSaveTrackingStatuses={handleSaveTrackingStatuses}
        onSaveVendorCapping={handleSaveVendorCapping}
      />

      <CampaignApiConfigModal
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        campaignId={campaign.id}
        campaign={campaign}
      />
    </AppShell>
  )
}

export default memo(CampaignDetailPage)
