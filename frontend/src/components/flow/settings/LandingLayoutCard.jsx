import { memo } from 'react'
import Button from '../../ui/Button'

export function LandingLayoutCard({
  funnelLayoutDraft,
  setFunnelLayoutDraft,
  savingFunnelLayout,
  savedFunnelLayout,
  onSave,
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-fg">Landing layout</h3>
        <p className="text-xs text-fg-muted mt-1">
          Identity checks run before Home. Home itself stays a free canvas — pack
          buttons are optional on any page.
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFunnelLayoutDraft('classic')}
            className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
              funnelLayoutDraft === 'classic'
                ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
            }`}
          >
            <p className="text-sm font-semibold text-fg">Classic</p>
            <p className="text-[11px] text-fg-muted mt-1 leading-snug">
              Home CTA then OTP / Confirm as today.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setFunnelLayoutDraft('packs_on_home')}
            className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
              funnelLayoutDraft === 'packs_on_home'
                ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
            }`}
          >
            <p className="text-sm font-semibold text-fg">Checks before Home</p>
            <p className="text-[11px] text-fg-muted mt-1 leading-snug">
              HE-only miss → Error + fail URL. OTP-only → OTP then checks. HE+OTP →
              HE hit then checks, miss then OTP. After OTP → Home.
            </p>
          </button>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={savingFunnelLayout || funnelLayoutDraft === savedFunnelLayout}
            onClick={onSave}
          >
            {savingFunnelLayout ? 'Saving...' : 'Save landing layout'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default memo(LandingLayoutCard)
