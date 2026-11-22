import { memo, useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import useStore from '../../store/useStore'
import {
  getEligibleFallbackCampaigns,
  CAPPING_INTERVALS,
  CAPPING_METRICS,
} from '../../utils/capping'

function VendorCappingModal({
  isOpen,
  onClose,
  vendor,
  tracking,
  campaign,
  onSave,
}) {
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)

  const [cappingEnabledDraft, setCappingEnabledDraft] = useState(false)
  const [cappingMetricDraft, setCappingMetricDraft] = useState('conversions')
  const [cappingLimitDraft, setCappingLimitDraft] = useState('')
  const [cappingActionDraft, setCappingActionDraft] = useState('stop')
  const [fallbackCampaignIdDraft, setFallbackCampaignIdDraft] = useState('')
  const [cappingIntervalDraft, setCappingIntervalDraft] = useState('daily')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns().catch(() => {})
    }
  }, [isOpen, fetchCampaigns])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      setCappingEnabledDraft(Boolean(tracking?.cappingEnabled))
      setCappingMetricDraft(tracking?.cappingMetric || 'conversions')
      setCappingLimitDraft(
        tracking?.cappingLimit != null ? String(tracking.cappingLimit) : '',
      )
      setCappingActionDraft(tracking?.cappingAction || 'stop')
      setFallbackCampaignIdDraft(
        tracking?.fallbackCampaignId != null ? String(tracking.fallbackCampaignId) : '',
      )
      setCappingIntervalDraft(tracking?.cappingInterval || 'daily')
    }, 0)
    return () => clearTimeout(timer)
  }, [isOpen, tracking])

  const eligibleFallbackCampaigns = useMemo(() => {
    return getEligibleFallbackCampaigns(campaign, campaigns)
  }, [campaign, campaigns])

  const hasChanges =
    cappingEnabledDraft !== Boolean(tracking?.cappingEnabled) ||
    cappingMetricDraft !== (tracking?.cappingMetric || 'conversions') ||
    cappingLimitDraft !==
      (tracking?.cappingLimit != null ? String(tracking.cappingLimit) : '') ||
    cappingActionDraft !== (tracking?.cappingAction || 'stop') ||
    fallbackCampaignIdDraft !==
      (tracking?.fallbackCampaignId != null ? String(tracking.fallbackCampaignId) : '') ||
    cappingIntervalDraft !== (tracking?.cappingInterval || 'daily')

  const handleSave = async () => {
    if (!vendor) return
    setSaving(true)
    try {
      await onSave(Number(vendor.id || tracking?.vendorId), {
        cappingEnabled: cappingEnabledDraft,
        cappingMetric: cappingMetricDraft,
        cappingLimit: cappingLimitDraft !== '' ? parseInt(cappingLimitDraft, 10) : null,
        cappingAction: cappingActionDraft,
        fallbackCampaignId: fallbackCampaignIdDraft ? parseInt(fallbackCampaignIdDraft, 10) : null,
        cappingInterval: cappingIntervalDraft,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const vendorName = vendor?.name || tracking?.vendor?.name || 'Vendor'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vendor Capping — ${vendorName}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Header Switch */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-fg">Enable Capping for this Vendor</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Limit clicks or conversions specifically for <strong>{vendorName}</strong> on this offer.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cappingEnabledDraft}
            onClick={() => setCappingEnabledDraft(!cappingEnabledDraft)}
            className={`
              relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
              transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${cappingEnabledDraft ? 'bg-accent' : 'bg-bg-subtle border border-border'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                transition-transform duration-200
                ${cappingEnabledDraft ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {cappingEnabledDraft ? (
          <div className="space-y-4">
            {/* Capping Metric Selector */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Cap Target Metric
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAPPING_METRICS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCappingMetricDraft(m.id)}
                    className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      cappingMetricDraft === m.id
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          cappingMetricDraft === m.id
                            ? 'border-accent bg-accent'
                            : 'border-border bg-bg'
                        }`}
                      >
                        {cappingMetricDraft === m.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="text-xs font-semibold text-fg">{m.label}</span>
                    </div>
                    <p className="text-[11px] text-fg-muted mt-1 ml-5.5 leading-snug">
                      {m.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  {cappingMetricDraft === 'conversions' ? 'Conversion Cap Limit' : 'Click Cap Limit'}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono focus:outline-none focus:border-accent"
                  value={cappingLimitDraft}
                  onChange={(e) => setCappingLimitDraft(e.target.value)}
                  placeholder={cappingMetricDraft === 'conversions' ? 'e.g. 50' : 'e.g. 200'}
                />
                <p className="text-[11px] text-fg-muted mt-1">
                  {cappingMetricDraft === 'conversions'
                    ? 'Maximum number of successful subscriptions/conversions allowed for this vendor.'
                    : 'Maximum number of accepted clicks/requests allowed for this vendor.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Reset Interval
                </label>
                <select
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:border-accent"
                  value={cappingIntervalDraft}
                  onChange={(e) => setCappingIntervalDraft(e.target.value)}
                >
                  {CAPPING_INTERVALS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-fg-muted mt-1">
                  Limits reset automatically in IST (Asia/Kolkata).
                </p>
              </div>
            </div>

            {/* Action Selector */}
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Action When Cap Is Reached
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCappingActionDraft('stop')}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    cappingActionDraft === 'stop'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        cappingActionDraft === 'stop'
                          ? 'border-accent bg-accent'
                          : 'border-border bg-bg'
                      }`}
                    >
                      {cappingActionDraft === 'stop' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-fg">Stop Traffic (403 Forbidden)</span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1 ml-5.5 leading-snug">
                    Reject further requests from this vendor with 403 Offer Stopped.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCappingActionDraft('fallback')}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    cappingActionDraft === 'fallback'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        cappingActionDraft === 'fallback'
                          ? 'border-accent bg-accent'
                          : 'border-border bg-bg'
                      }`}
                    >
                      {cappingActionDraft === 'fallback' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-fg">Fallback Campaign</span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1 ml-5.5 leading-snug">
                    Seamlessly reroute this vendor’s traffic to another campaign.
                  </p>
                </button>
              </div>
            </div>

            {/* Fallback Campaign Dropdown (if action is fallback) */}
            {cappingActionDraft === 'fallback' && (
              <div className="p-3 bg-bg-muted/40 rounded-xl border border-border space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-fg mb-1">
                    Select Fallback Campaign
                  </label>
                  <select
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:border-accent"
                    value={fallbackCampaignIdDraft}
                    onChange={(e) => setFallbackCampaignIdDraft(e.target.value)}
                  >
                    <option value="">
                      Use Campaign Default Fallback (
                      {campaign?.fallbackCampaignId ? `#${campaign.fallbackCampaignId}` : 'None'}
                      )
                    </option>
                    {eligibleFallbackCampaigns.map((fc) => (
                      <option key={fc.id} value={fc.id}>
                        #{fc.id} — {fc.name} ({fc.country || fc.marketOperator?.country?.code} · {fc.operator || fc.marketOperator?.name})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-fg-muted mt-1">
                    The vendor must also be assigned to the fallback campaign.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Vendor Capping'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(VendorCappingModal)
