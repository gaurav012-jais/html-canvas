import { memo } from 'react'
import Button from '../../ui/Button'

export function SuccessRedirectCard({
  successUrlDraft,
  setSuccessUrlDraft,
  successModeDraft,
  setSuccessModeDraft,
  savingSuccessUrl,
  onSave,
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-fg">Success / content URL</h3>
        <p className="text-xs text-fg-muted mt-1">
          Portal / content URL after a successful subscribe (or already subscribed). Leave empty
          to stay on thank-you.{' '}
          <code className="font-mono">{'{{msisdn}}'}</code>,{' '}
          <code className="font-mono">{'{{click_id}}'}</code> /{' '}
          <code className="font-mono">{'{rcid}'}</code> supported like CG redirect.
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
            value={successUrlDraft}
            onChange={(e) => setSuccessUrlDraft(e.target.value)}
            placeholder="https://content.example/portal?msisdn={{msisdn}}"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={savingSuccessUrl}
            onClick={onSave}
          >
            {savingSuccessUrl ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <div>
          <p className="text-xs font-medium text-fg mb-2">After success</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSuccessModeDraft('thankyou')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                successModeDraft === 'thankyou'
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">Show thank-you</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                Show thank-you ~2s, then redirect to the portal URL.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSuccessModeDraft('immediate')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                successModeDraft === 'immediate'
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">Redirect immediately</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                Skip thank-you paint — go straight to the portal URL.
              </p>
            </button>
          </div>
          <p className="text-[11px] text-fg-subtle mt-2">
            Click Save above to persist the URL and this mode together.
          </p>
        </div>
      </div>
    </div>
  )
}

export default memo(SuccessRedirectCard)
