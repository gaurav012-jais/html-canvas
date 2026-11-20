import { memo } from 'react'
import { isApiExposeEntry } from '../verificationModes'

export function FlowModeOptions({
  draftMode,
  draftEntry,
  setDraftEntry,
  draftAfterIdentity,
  setDraftAfterIdentity,
  isLocked = false,
}) {
  const showOtpApiExposeDocs = draftMode === 'OTP_ONLY' && isApiExposeEntry(draftEntry)
  const showDcbApiExposeDocs = draftMode === 'UNIVERSE_DCB' && isApiExposeEntry(draftEntry)

  return (
    <>
      {draftMode === 'OTP_ONLY' && (
        <>
          <div>
            <p className="text-xs font-medium text-fg mb-2">Landing page</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setDraftEntry('HOME')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                }${
                  draftEntry === 'HOME'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">HOME first</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Show intro, then OTP, then HOME packs.
                </p>
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setDraftEntry('OTP')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                }${
                  draftEntry === 'OTP'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">OTP first</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Skip HOME on landing — PIN first, then HOME packs.
                </p>
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setDraftEntry('API_EXPOSE')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                }${
                  draftEntry === 'API_EXPOSE'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">API expose</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  No WAP pages — expose public OTP send/verify URLs.
                </p>
              </button>
            </div>
          </div>

          {!isApiExposeEntry(draftEntry) && (
            <div>
              <p className="text-xs font-medium text-fg mb-2">After OTP verified</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setDraftAfterIdentity('HOME')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                  }${
                    draftAfterIdentity === 'HOME' || draftAfterIdentity === 'CONFIRM'
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
                  onClick={() => setDraftAfterIdentity('THANKYOU')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                  }${
                    draftAfterIdentity === 'THANKYOU'
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

          {showOtpApiExposeDocs && (
            <p className="text-[11px] text-fg-muted">
              Vendor send/verify APIs are in the Vendors tab.
            </p>
          )}
        </>
      )}

      {draftMode === 'UNIVERSE_DCB' && (
        <>
          <div>
            <p className="text-xs font-medium text-fg mb-2">Delivery</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setDraftEntry('OTP')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                }${
                  !isApiExposeEntry(draftEntry)
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
                onClick={() => setDraftEntry('API_EXPOSE')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                }${
                  isApiExposeEntry(draftEntry)
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

          {showDcbApiExposeDocs && (
            <p className="text-[11px] text-fg-muted">
              Vendor billing PIN APIs are in the Vendors tab.
            </p>
          )}
        </>
      )}

      {(draftMode === 'HEADER_INJECTION' || draftMode === 'BOTH') && (
        <div>
          <p className="text-xs font-medium text-fg mb-2">
            {draftMode === 'BOTH'
              ? 'After number resolved (HE or OTP)'
              : 'After HE resolved'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setDraftAfterIdentity('HOME')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isLocked ? 'cursor-not-allowed opacity-80 ' : ''
              }${
                draftAfterIdentity === 'HOME' || draftAfterIdentity === 'CONFIRM'
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
              onClick={() => setDraftAfterIdentity('THANKYOU')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                isLocked ? 'cursor-not-allowed opacity-80 ' : ''
              }${
                draftAfterIdentity === 'THANKYOU'
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
          {draftMode === 'HEADER_INJECTION' && (
            <p className="text-[11px] text-fg-muted mt-2 leading-snug">
              If HE finds no number → Error page (and fail/CG URL if set). OTP is not used in
              this mode.
            </p>
          )}
          {draftMode === 'BOTH' && (
            <p className="text-[11px] text-fg-muted mt-2 leading-snug">
              HE miss still opens OTP first, then this same HOME / Skip HOME choice.
            </p>
          )}
        </div>
      )}
    </>
  )
}

export default memo(FlowModeOptions)
