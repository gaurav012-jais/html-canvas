import { memo } from 'react'
import Button from '../../ui/Button'

export function CallbackTimingCard({
  funnelLayoutDraft,
  postbackAtDraft,
  setPostbackAtDraft,
  savingPostbackAt,
  savedPostback,
  packsAdvancedOn,
  savedPacksAdvancedOn,
  onSave,
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-fg">Vendor CPA callback</h3>
        <p className="text-xs text-fg-muted mt-1">
          Pending is queued here. Fire happens later when the operator hits{' '}
          <code className="font-mono">/api/flow/callback</code>.
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {funnelLayoutDraft === 'packs_on_home' ? (
          <>
            <p className="text-sm text-fg-muted leading-relaxed">
              <span className="font-semibold text-fg">On pack / subscribe click.</span>{' '}
              Daily, weekly, or monthly CTAs (any page) queue a pending row. HE-detect
              does not. Uncheck &quot;Queue vendor postback&quot; on a button to skip it.
              Same MSISDN upserts one row.
            </p>
            <details className="rounded-lg border border-border bg-bg-elevated px-3.5 py-3">
              <summary className="text-sm font-medium text-fg cursor-pointer select-none">
                Advanced
              </summary>
              <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={postbackAtDraft === 'both' || postbackAtDraft === 'otp'}
                  onChange={(e) =>
                    setPostbackAtDraft(e.target.checked ? 'both' : 'confirm')
                  }
                />
                <span>
                  <span className="text-sm font-semibold text-fg">
                    Also queue on OTP verify
                  </span>
                  <span className="block text-[11px] text-fg-muted mt-0.5 leading-snug">
                    Legacy pin-to-bill. Pending is created before the user picks a pack.
                    Pack clicks still upsert the same MSISDN row.
                  </span>
                </span>
              </label>
              <div className="flex justify-end mt-3">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={
                    savingPostbackAt || packsAdvancedOn === savedPacksAdvancedOn
                  }
                  onClick={onSave}
                >
                  {savingPostbackAt ? 'Saving...' : 'Save callback timing'}
                </Button>
              </div>
            </details>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPostbackAtDraft('confirm')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  postbackAtDraft === 'confirm'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">On Confirm</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Classic — queue when user clicks Confirm / subscribe.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPostbackAtDraft('otp')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  postbackAtDraft === 'otp'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">On OTP verify</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Pin = subscribe / Skip HOME — queue right after OTP continue.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPostbackAtDraft('both')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  postbackAtDraft === 'both'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Both</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  OTP continue and Confirm click (upsert same MSISDN row).
                </p>
              </button>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={savingPostbackAt || postbackAtDraft === savedPostback}
                onClick={onSave}
              >
                {savingPostbackAt ? 'Saving...' : 'Save callback timing'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(CallbackTimingCard)
