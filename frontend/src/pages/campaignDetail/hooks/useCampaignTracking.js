import { useState } from 'react'
import useStore from '../../../store/useStore'
import { clampPayoutPercent } from '../../../services/api/otp'

export function useCampaignTracking({ campaign, vendors, updateCampaign }) {
  const [assigningVendor, setAssigningVendor] = useState(false)
  const [selectedVendorForAdd, setSelectedVendorForAdd] = useState('')
  const [addPayoutPercent, setAddPayoutPercent] = useState(100)
  const [addAllowedStatuses, setAddAllowedStatuses] = useState('')

  const serializeTrackings = (list) =>
    (list || [])
      .map((t) => ({
        vendorId: Number(t.vendorId ?? t.vendor?.id),
        affiliateId: null,
        active: t.active !== false,
        payoutPercent: clampPayoutPercent(t.payoutPercent ?? 100),
        allowedCallbackStatuses:
          typeof t.allowedCallbackStatuses === 'string'
            ? t.allowedCallbackStatuses.trim() || null
            : t.allowedCallbackStatuses || null,
        cappingEnabled: Boolean(t.cappingEnabled),
        cappingMetric:
          String(t.cappingMetric || '').toLowerCase() === 'clicks'
            ? 'clicks'
            : 'conversions',
        cappingLimit:
          t.cappingLimit != null && t.cappingLimit !== ''
            ? parseInt(t.cappingLimit, 10)
            : null,
        cappingAction:
          String(t.cappingAction || '').toLowerCase() === 'fallback'
            ? 'fallback'
            : 'stop',
        cappingInterval: ['daily', 'weekly', 'monthly', 'total'].includes(
          String(t.cappingInterval || '').toLowerCase(),
        )
          ? String(t.cappingInterval).toLowerCase()
          : 'daily',
        fallbackCampaignId:
          t.fallbackCampaignId != null && t.fallbackCampaignId !== ''
            ? parseInt(t.fallbackCampaignId, 10)
            : null,
      }))
      .filter((t) => t.vendorId)

  const handleSubmitTracking = async () => {
    if (!campaign || !selectedVendorForAdd) return
    setAssigningVendor(true)
    try {
      const vendorId = Number(selectedVendorForAdd)
      const currentTrackings = serializeTrackings(campaign.trackings).filter(
        (t) => t.vendorId !== vendorId,
      )

      if (!currentTrackings.find((t) => t.vendorId === vendorId)) {
        const vendor = vendors.find((v) => Number(v.id) === vendorId)
        currentTrackings.push({
          vendorId,
          affiliateId: null,
          active: true,
          payoutPercent: clampPayoutPercent(addPayoutPercent),
          allowedCallbackStatuses:
            addAllowedStatuses.trim() ||
            vendor?.allowedCallbackStatuses?.trim() ||
            null,
        })
        await updateCampaign(campaign.id, { trackings: currentTrackings })
        useStore.getState().addToast('Vendor assigned', 'success')
      }
      setSelectedVendorForAdd('')
      setAddPayoutPercent(100)
      setAddAllowedStatuses('')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleRemoveTracking = async (vendorId) => {
    if (!campaign) return
    const ok = window.confirm(
      'Remove this tracking assignment? The shareable link will stop working for this vendor.',
    )
    if (!ok) return
    setAssigningVendor(true)
    try {
      const newTrackings = serializeTrackings(campaign.trackings).filter(
        (t) => t.vendorId !== Number(vendorId),
      )
      await updateCampaign(campaign.id, { trackings: newTrackings })
      useStore.getState().addToast('Tracking removed', 'success')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleToggleTrackingActive = async (vendorId) => {
    if (!campaign) return
    setAssigningVendor(true)
    try {
      const targetVendorId = Number(vendorId)
      const currentTrackings = serializeTrackings(campaign.trackings).map((t) => ({
        ...t,
        active: t.vendorId === targetVendorId ? !t.active : t.active,
      }))
      await updateCampaign(campaign.id, { trackings: currentTrackings })
      const nowActive = currentTrackings.find(
        (t) => t.vendorId === targetVendorId,
      )?.active
      useStore.getState().addToast(
        nowActive
          ? 'Assignment activated'
          : 'Assignment deactivated — link will show not available',
        'success',
      )
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleSavePayoutPercent = async (vendorId, nextPercent) => {
    if (!campaign) return
    const payoutPercent = clampPayoutPercent(nextPercent)
    const current = serializeTrackings(campaign.trackings)
    const existing = current.find((t) => t.vendorId === Number(vendorId))
    if (!existing || existing.payoutPercent === payoutPercent) return
    setAssigningVendor(true)
    try {
      await updateCampaign(campaign.id, {
        trackings: current.map((t) =>
          t.vendorId === Number(vendorId) ? { ...t, payoutPercent } : t,
        ),
      })
      useStore.getState().addToast(`Payout set to ${payoutPercent}%`, 'success')
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleSaveTrackingStatuses = async (vendorId, nextStatuses) => {
    if (!campaign) return
    const allowedCallbackStatuses = String(nextStatuses || '').trim() || null
    const current = serializeTrackings(campaign.trackings)
    const existing = current.find((t) => t.vendorId === Number(vendorId))
    if (
      !existing ||
      (existing.allowedCallbackStatuses || null) === allowedCallbackStatuses
    ) {
      return
    }
    setAssigningVendor(true)
    try {
      await updateCampaign(campaign.id, {
        trackings: current.map((t) =>
          t.vendorId === Number(vendorId) ? { ...t, allowedCallbackStatuses } : t,
        ),
      })
      useStore.getState().addToast(
        allowedCallbackStatuses
          ? `This assignment fires on: ${allowedCallbackStatuses}`
          : 'Cleared — this assignment uses the vendor default',
        'success',
      )
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleSaveVendorCapping = async (vendorId, cappingData) => {
    if (!campaign) return
    const current = serializeTrackings(campaign.trackings)
    setAssigningVendor(true)
    try {
      await updateCampaign(campaign.id, {
        trackings: current.map((t) =>
          t.vendorId === Number(vendorId) ? { ...t, ...cappingData } : t,
        ),
      })
      useStore
        .getState()
        .addToast('Vendor capping saved successfully', 'success')
    } finally {
      setAssigningVendor(false)
    }
  }

  return {
    assigningVendor,
    selectedVendorForAdd,
    setSelectedVendorForAdd,
    addPayoutPercent,
    setAddPayoutPercent,
    addAllowedStatuses,
    setAddAllowedStatuses,
    serializeTrackings,
    handleSubmitTracking,
    handleRemoveTracking,
    handleToggleTrackingActive,
    handleSavePayoutPercent,
    handleSaveTrackingStatuses,
    handleSaveVendorCapping,
  }
}
