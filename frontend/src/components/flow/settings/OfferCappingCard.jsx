import { memo } from 'react'
import Button from '../../ui/Button'
import { CAPPING_INTERVALS, CAPPING_METRICS } from '../../../utils/capping'

export function OfferCappingCard({
  cappingEnabledDraft,
  setCappingEnabledDraft,
  cappingMetricDraft,
  setCappingMetricDraft,
  cappingLimitDraft,
  setCappingLimitDraft,
  cappingIntervalDraft,
  setCappingIntervalDraft,
  cappingActionDraft,
  setCappingActionDraft,
  fallbackCampaignIdDraft,
  setFallbackCampaignIdDraft,
  isCurrentApiExpose,
  eligibleFallbackCampaigns,
  mappedCount,
  totalAssigned,
  unmappedCount,
  savingCapping,
  hasCappingChanges,
  onSave,
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Offer Capping &amp; Traffic Fallback</h3>
          <p className="text-xs text-fg-muted mt-1">
            Set conversion or click limits for this offer. When the cap is reached, traffic can be stopped or redirected to another compatible offer.
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

      {cappingEnabledDraft && (
        <div className="px-5 py-4 space-y-4">
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
                placeholder={cappingMetricDraft === 'conversions' ? 'e.g. 50' : 'e.g. 100'}
              />
              <p className="text-[11px] text-fg-muted mt-1">
                {cappingMetricDraft === 'conversions'
                  ? 'Maximum number of successful subscriptions/conversions before action triggers.'
                  : 'Maximum number of accepted clicks/requests before action triggers.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1">
                Reset Interval
              </label>
              <select
                value={cappingIntervalDraft}
                onChange={(e) => setCappingIntervalDraft(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:border-accent"
              >
                {CAPPING_INTERVALS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-fg-muted mt-1">
                Whether the count resets daily, weekly, monthly (at 00:00 IST), or accumulates as a lifetime cap.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg mb-1.5">
              Action When Cap Reached
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCappingActionDraft('stop')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  cappingActionDraft === 'stop'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Stop Traffic</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  {cappingMetricDraft === 'conversions'
                    ? 'New traffic is immediately stopped once the conversion limit is reached.'
                    : 'Clicks are immediately stopped. No DB visit is logged, and an "Offer Stopped" message is served.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCappingActionDraft('fallback')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  cappingActionDraft === 'fallback'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Fallback / Redirect</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  {cappingMetricDraft === 'conversions'
                    ? 'Forward new traffic to another offer once the conversion limit is reached. Current offer conversions are preserved.'
                    : 'Forward traffic to another offer. Current offer click count is preserved; target offer records and counts the clicks.'}
                </p>
              </button>
            </div>
          </div>

          {cappingActionDraft === 'fallback' && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-fg">
                    Fallback Target Offer
                  </label>
                  <span className="text-[11px] text-fg-subtle">
                    {isCurrentApiExpose
                      ? 'Showing API expose offers with matching flow'
                      : 'Showing Webpage URL offers'}
                  </span>
                </div>
                <select
                  value={fallbackCampaignIdDraft}
                  onChange={(e) => setFallbackCampaignIdDraft(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg focus:outline-none focus:border-accent"
                >
                  <option value="">-- Select a fallback campaign --</option>
                  {eligibleFallbackCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} - {c.name} ({c.country} / {c.operator}) [{c.verificationMode || 'BOTH'}]
                    </option>
                  ))}
                </select>
                {eligibleFallbackCampaigns.length === 0 && (
                  <p className="text-[11px] text-warning mt-1">
                    No compatible fallback campaigns found matching the filtering criteria.
                  </p>
                )}
              </div>

              {fallbackCampaignIdDraft && (
                <div
                  className={`rounded-lg border px-3.5 py-2.5 text-xs ${
                    unmappedCount > 0
                      ? 'border-warning/40 bg-warning-muted/30 text-fg'
                      : 'border-success/40 bg-success-muted/30 text-fg'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    {unmappedCount > 0 ? '⚠️ Vendor Mapping Notice' : '✅ Full Vendor Coverage'}
                  </div>
                  <p className="text-[11px] leading-relaxed text-fg-muted">
                    {unmappedCount > 0
                      ? `${mappedCount} of ${totalAssigned} vendor(s) assigned to this campaign are also assigned to the target offer. The remaining ${unmappedCount} unassigned vendor(s) will be stopped with 'Offer Stopped' to prevent anonymous untracked clicks.`
                      : `All ${totalAssigned} assigned vendor(s) are mapped to the target offer. Traffic will smoothly transition without tracking loss.`}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={savingCapping || !hasCappingChanges}
              onClick={onSave}
            >
              {savingCapping ? 'Saving...' : 'Save capping settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(OfferCappingCard)
