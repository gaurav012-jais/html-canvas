import { memo, useEffect, useState, useMemo } from 'react'
import useStore from '../../store/useStore'
import { isApiExposeCampaign } from './verificationModes'
import {
  getEligibleFallbackCampaigns,
  calculateVendorCoverage,
} from '../../utils/capping'
import LandingLayoutCard from './settings/LandingLayoutCard'
import CgRedirectCard from './settings/CgRedirectCard'
import SuccessRedirectCard from './settings/SuccessRedirectCard'
import CallbackTimingCard from './settings/CallbackTimingCard'
import OfferCappingCard from './settings/OfferCappingCard'

/**
 * Campaign redirect / postback settings that belong with Flow Builder
 * (CG redirect, success portal URL, CPA callback timing, offer capping).
 */
function FlowCampaignSettings({ campaignId }) {
  const campaign = useStore((s) => s.campaign)
  const updateCampaign = useStore((s) => s.updateCampaign)

  const [cgUrlDraft, setCgUrlDraft] = useState('')
  const [savingCg, setSavingCg] = useState(false)
  const [successUrlDraft, setSuccessUrlDraft] = useState('')
  const [successModeDraft, setSuccessModeDraft] = useState('thankyou')
  const [savingSuccessUrl, setSavingSuccessUrl] = useState(false)
  const [postbackAtDraft, setPostbackAtDraft] = useState('confirm')
  const [savingPostbackAt, setSavingPostbackAt] = useState(false)
  const [funnelLayoutDraft, setFunnelLayoutDraft] = useState('classic')
  const [savingFunnelLayout, setSavingFunnelLayout] = useState(false)

  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)

  const [cappingEnabledDraft, setCappingEnabledDraft] = useState(false)
  const [cappingMetricDraft, setCappingMetricDraft] = useState('conversions')
  const [cappingLimitDraft, setCappingLimitDraft] = useState('')
  const [cappingActionDraft, setCappingActionDraft] = useState('stop')
  const [fallbackCampaignIdDraft, setFallbackCampaignIdDraft] = useState('')
  const [cappingIntervalDraft, setCappingIntervalDraft] = useState('daily')
  const [savingCapping, setSavingCapping] = useState(false)

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    if (!campaign || String(campaign.id) !== String(campaignId)) return
    setCgUrlDraft(campaign.cgRedirectUrl || '')
    setSuccessUrlDraft(campaign.successRedirectUrl || '')
    setSuccessModeDraft(
      campaign.successRedirectMode === 'immediate' ? 'immediate' : 'thankyou',
    )
    const v = campaign.postbackRegisterAt
    setPostbackAtDraft(v === 'otp' || v === 'both' ? v : 'confirm')
    setFunnelLayoutDraft(
      campaign.funnelLayout === 'packs_on_home' ? 'packs_on_home' : 'classic',
    )
    setCappingEnabledDraft(Boolean(campaign.cappingEnabled))
    setCappingMetricDraft(campaign.cappingMetric || 'conversions')
    setCappingLimitDraft(
      campaign.cappingLimit != null ? String(campaign.cappingLimit) : '',
    )
    setCappingActionDraft(campaign.cappingAction || 'stop')
    setFallbackCampaignIdDraft(
      campaign.fallbackCampaignId != null ? String(campaign.fallbackCampaignId) : '',
    )
    setCappingIntervalDraft(campaign.cappingInterval || 'daily')
  }, [
    campaignId,
    campaign?.id,
    campaign?.cgRedirectUrl,
    campaign?.successRedirectUrl,
    campaign?.successRedirectMode,
    campaign?.postbackRegisterAt,
    campaign?.funnelLayout,
    campaign?.cappingEnabled,
    campaign?.cappingMetric,
    campaign?.cappingLimit,
    campaign?.cappingAction,
    campaign?.fallbackCampaignId,
    campaign?.cappingInterval,
  ])

  if (!campaign || String(campaign.id) !== String(campaignId)) return null

  const savedPostback =
    campaign.postbackRegisterAt === 'otp' || campaign.postbackRegisterAt === 'both'
      ? campaign.postbackRegisterAt
      : 'confirm'

  const packsAdvancedOn =
    postbackAtDraft === 'both' || postbackAtDraft === 'otp'
  const savedPacksAdvancedOn =
    savedPostback === 'both' || savedPostback === 'otp'

  const handleSaveFunnelLayout = async () => {
    setSavingFunnelLayout(true)
    try {
      const layout =
        funnelLayoutDraft === 'packs_on_home' ? 'packs_on_home' : 'classic'
      await updateCampaign(campaign.id, { funnelLayout: layout })
      useStore.getState().addToast('Landing layout saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingFunnelLayout(false)
    }
  }

  const handleSaveCgUrl = async () => {
    setSavingCg(true)
    try {
      await updateCampaign(campaign.id, {
        cgRedirectUrl: cgUrlDraft.trim() || null,
      })
      useStore.getState().addToast('CG redirect URL saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingCg(false)
    }
  }

  const handleSaveSuccessUrl = async () => {
    setSavingSuccessUrl(true)
    try {
      await updateCampaign(campaign.id, {
        successRedirectUrl: successUrlDraft.trim() || null,
        successRedirectMode: successModeDraft === 'immediate' ? 'immediate' : 'thankyou',
      })
      useStore.getState().addToast('Success redirect saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingSuccessUrl(false)
    }
  }

  const handleSavePostbackAt = async () => {
    setSavingPostbackAt(true)
    try {
      const mode =
        postbackAtDraft === 'otp' || postbackAtDraft === 'both'
          ? postbackAtDraft
          : 'confirm'
      await updateCampaign(campaign.id, { postbackRegisterAt: mode })
      useStore.getState().addToast('Callback timing saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingPostbackAt(false)
    }
  }

  const isCurrentApiExpose = isApiExposeCampaign(campaign)

  const eligibleFallbackCampaigns = useMemo(() => {
    return getEligibleFallbackCampaigns(campaign, campaigns)
  }, [campaign, campaigns])

  const selectedTargetCampaign = useMemo(() => {
    if (!fallbackCampaignIdDraft || !campaigns) return null
    return campaigns.find((c) => String(c.id) === String(fallbackCampaignIdDraft)) || null
  }, [fallbackCampaignIdDraft, campaigns])

  const { mappedCount, totalAssigned, unmappedCount } = useMemo(() => {
    return calculateVendorCoverage(campaign, selectedTargetCampaign)
  }, [campaign, selectedTargetCampaign])

  const hasCappingChanges =
    cappingEnabledDraft !== Boolean(campaign.cappingEnabled) ||
    cappingMetricDraft !== (campaign.cappingMetric || 'conversions') ||
    cappingLimitDraft !==
      (campaign.cappingLimit != null ? String(campaign.cappingLimit) : '') ||
    cappingActionDraft !== (campaign.cappingAction || 'stop') ||
    fallbackCampaignIdDraft !==
      (campaign.fallbackCampaignId != null ? String(campaign.fallbackCampaignId) : '') ||
    cappingIntervalDraft !== (campaign.cappingInterval || 'daily')

  const handleSaveCapping = async () => {
    setSavingCapping(true)
    try {
      await updateCampaign(campaign.id, {
        cappingEnabled: cappingEnabledDraft,
        cappingMetric: cappingMetricDraft,
        cappingLimit: cappingLimitDraft !== '' ? parseInt(cappingLimitDraft, 10) : null,
        cappingAction: cappingActionDraft,
        fallbackCampaignId: fallbackCampaignIdDraft ? parseInt(fallbackCampaignIdDraft, 10) : null,
        cappingInterval: cappingIntervalDraft,
      })
      useStore.getState().addToast('Capping settings saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingCapping(false)
    }
  }

  const savedFunnelLayout =
    campaign.funnelLayout === 'packs_on_home' ? 'packs_on_home' : 'classic'

  return (
    <div className="space-y-4">
      <LandingLayoutCard
        funnelLayoutDraft={funnelLayoutDraft}
        setFunnelLayoutDraft={setFunnelLayoutDraft}
        savingFunnelLayout={savingFunnelLayout}
        savedFunnelLayout={savedFunnelLayout}
        onSave={handleSaveFunnelLayout}
      />

      <CgRedirectCard
        cgUrlDraft={cgUrlDraft}
        setCgUrlDraft={setCgUrlDraft}
        savingCg={savingCg}
        onSave={handleSaveCgUrl}
      />

      <SuccessRedirectCard
        successUrlDraft={successUrlDraft}
        setSuccessUrlDraft={setSuccessUrlDraft}
        successModeDraft={successModeDraft}
        setSuccessModeDraft={setSuccessModeDraft}
        savingSuccessUrl={savingSuccessUrl}
        onSave={handleSaveSuccessUrl}
      />

      <CallbackTimingCard
        funnelLayoutDraft={funnelLayoutDraft}
        postbackAtDraft={postbackAtDraft}
        setPostbackAtDraft={setPostbackAtDraft}
        savingPostbackAt={savingPostbackAt}
        savedPostback={savedPostback}
        packsAdvancedOn={packsAdvancedOn}
        savedPacksAdvancedOn={savedPacksAdvancedOn}
        onSave={handleSavePostbackAt}
      />

      <OfferCappingCard
        cappingEnabledDraft={cappingEnabledDraft}
        setCappingEnabledDraft={setCappingEnabledDraft}
        cappingMetricDraft={cappingMetricDraft}
        setCappingMetricDraft={setCappingMetricDraft}
        cappingLimitDraft={cappingLimitDraft}
        setCappingLimitDraft={setCappingLimitDraft}
        cappingIntervalDraft={cappingIntervalDraft}
        setCappingIntervalDraft={setCappingIntervalDraft}
        cappingActionDraft={cappingActionDraft}
        setCappingActionDraft={setCappingActionDraft}
        fallbackCampaignIdDraft={fallbackCampaignIdDraft}
        setFallbackCampaignIdDraft={setFallbackCampaignIdDraft}
        isCurrentApiExpose={isCurrentApiExpose}
        eligibleFallbackCampaigns={eligibleFallbackCampaigns}
        mappedCount={mappedCount}
        totalAssigned={totalAssigned}
        unmappedCount={unmappedCount}
        savingCapping={savingCapping}
        hasCappingChanges={hasCappingChanges}
        onSave={handleSaveCapping}
      />
    </div>
  )
}

export default memo(FlowCampaignSettings)
