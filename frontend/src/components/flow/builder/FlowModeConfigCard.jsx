import { memo } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  VERIFICATION_MODES,
  isApiExposeEntry,
  isNullIdentityMode,
} from '../verificationModes'

export function FlowModeConfigCard({
  mode,
  isLocked,
  entryPage,
  afterIdentity,
  handleModeChange,
  handleEntryPageChange,
  handleAfterIdentityChange,
  handleResetFlow,
  handleResetPages,
  resettingPages,
}) {
  const showApiExpose =
    (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') && isApiExposeEntry(entryPage)

  return (
    <div className="surface-card p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-fg mb-2">Verification mode</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {VERIFICATION_MODES.map((m) => {
            const selected = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                disabled={isLocked}
                onClick={() => handleModeChange(m.id)}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                }${
                  selected
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">{m.label}</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">{m.hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      {mode === 'OTP_ONLY' && (
        <>
          <div>
            <p className="text-xs font-medium text-fg mb-2">Landing page</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'HOME',
                  title: 'HOME first',
                  hint: 'Show intro, then OTP, then HOME packs.',
                },
                {
                  id: 'OTP',
                  title: 'OTP first',
                  hint: 'Skip HOME on landing — PIN first, then HOME packs.',
                },
                {
                  id: 'API_EXPOSE',
                  title: 'API expose',
                  hint: 'No WAP pages — expose public OTP send/verify URLs.',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleEntryPageChange(opt.id)}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                  }${
                    entryPage === opt.id
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">{opt.title}</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {!showApiExpose && (
            <div>
              <p className="text-xs font-medium text-fg mb-2">After OTP verified</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleAfterIdentityChange('HOME')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                  }${
                    afterIdentity === 'HOME' || afterIdentity === 'CONFIRM'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">HOME page</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Pack / subscribe CTAs on HOME after PIN.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleAfterIdentityChange('THANKYOU')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                  }${
                    afterIdentity === 'THANKYOU'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">Skip HOME</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    PIN verify → Thank you / portal (no pack page).
                  </p>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'UNIVERSE_DCB' && (
        <div>
          <p className="text-xs font-medium text-fg mb-2">Delivery</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleEntryPageChange('OTP')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isLocked ? 'cursor-not-allowed opacity-80 ' : ''
              }${
                !isApiExposeEntry(entryPage)
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">WAP funnel</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                Full pages: number → pack → PIN → activation poll.
              </p>
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleEntryPageChange('API_EXPOSE')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isLocked ? 'cursor-not-allowed opacity-80 ' : ''
              }${
                isApiExposeEntry(entryPage)
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">API expose</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                No pages — vendor billing PIN request / confirm / status APIs.
              </p>
            </button>
          </div>
        </div>
      )}

      {showApiExpose && (
        <p className="text-[11px] text-fg-muted">
          {mode === 'UNIVERSE_DCB'
            ? 'Vendor billing PIN APIs are in the Vendors tab. Configure Universe DCB in Campaign API.'
            : 'Vendor send/verify APIs are in the Vendors tab. Configure Partner OTP in Campaign API.'}
        </p>
      )}

      {(mode === 'HEADER_INJECTION' || mode === 'BOTH') && (
        <div>
          <p className="text-xs font-medium text-fg mb-2">
            {mode === 'BOTH' ? 'After number resolved (HE or OTP)' : 'After HE resolved'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleAfterIdentityChange('HOME')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isLocked ? 'cursor-not-allowed opacity-80 ' : ''
              }${
                afterIdentity === 'HOME' || afterIdentity === 'CONFIRM'
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">HOME page</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                Show HOME with pack / subscribe CTAs.
              </p>
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => handleAfterIdentityChange('THANKYOU')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isLocked ? 'cursor-not-allowed opacity-80 ' : ''
              }${
                afterIdentity === 'THANKYOU'
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">Skip HOME</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                Number resolved → Thank you / portal (no pack page).
              </p>
            </button>
          </div>
          {mode === 'HEADER_INJECTION' && (
            <p className="text-[11px] text-fg-muted mt-2 leading-snug">
              If HE finds no number → Error page (and fail/CG URL if set). OTP is not used in
              this mode.
            </p>
          )}
          {mode === 'BOTH' && (
            <p className="text-[11px] text-fg-muted mt-2 leading-snug">
              HE miss still opens OTP first, then this same HOME / Skip HOME choice.
            </p>
          )}
        </div>
      )}

      {isNullIdentityMode(mode) && (
        <p className="text-[11px] text-fg-muted">
          {mode === 'CG_HOME' ? (
            <>
              Landing shows <strong>HOME</strong> (no HE). Subscribe sends the user to the CG URL
              with <code className="font-mono">click_id</code>. Set the CG URL below.
            </>
          ) : (
            <>
              Start page is locked to <strong>HOME</strong> for this mode. If a CG URL is set,
              landing redirects immediately. Change connections on the canvas or use Reset layout
              after switching modes.
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isLocked}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-dashed border-border hover:border-fg-muted rounded-md text-xs font-medium text-fg-muted hover:text-fg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleResetFlow}
        >
          Reset layout to default for this mode
        </button>
        <button
          type="button"
          disabled={isLocked || resettingPages}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-accent/40 bg-accent-muted/20 hover:bg-accent-muted/40 rounded-md text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleResetPages}
          title="Reset all page HTML/CSS to default without deleting any clicks or logs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resettingPages ? 'animate-spin' : ''}`} />
          {resettingPages ? 'Resetting pages…' : 'Reset pages to default'}
        </button>
      </div>
    </div>
  )
}

export default memo(FlowModeConfigCard)
