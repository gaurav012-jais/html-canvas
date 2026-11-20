import { memo } from 'react'
import { isNullIdentityMode } from '../verificationModes'

export function FlowStartChecksCard({
  mode,
  startConfig,
  patchStartConfig,
  isLocked = false,
}) {
  return (
    <div
      className="surface-card p-3 shrink-0 border border-emerald-300/50 bg-emerald-50/40"
      data-testid="flow-start-checks"
    >
      <p className="text-[11px] font-medium text-fg-muted mb-2">
        START — before first page
      </p>
      <p className="text-xs text-fg-muted mb-3 leading-snug">
        These run on landing (detect) before HOME / OTP is shown. Partner API URLs still
        come from Campaign API settings.
      </p>
      <div className="space-y-2">
        {[
          {
            key: 'runHe',
            label: 'Header enrichment (HE)',
            hint: 'Resolve MSISDN before showing the first page',
            disabled: mode === 'OTP_ONLY' || mode === 'ORANGE_BF' || isNullIdentityMode(mode),
          },
          {
            key: 'runBlocklist',
            label: 'Blocklist check',
            hint: 'If blocked → BLOCKED page',
          },
          {
            key: 'runChecksub',
            label: 'Check subscription',
            hint: 'If already active → Thank you / redirect',
          },
        ].map((row) => (
          <label
            key={row.key}
            className={`flex items-start gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-2 ${
              isLocked || row.disabled ? 'opacity-50' : ''
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(startConfig[row.key])}
              disabled={isLocked || row.disabled}
              onChange={(e) => patchStartConfig({ [row.key]: e.target.checked })}
            />
            <span>
              <span className="text-xs font-semibold text-fg block">{row.label}</span>
              <span className="text-[11px] text-fg-muted leading-snug">
                {row.disabled ? `Locked off for ${mode} mode` : row.hint}
              </span>
            </span>
          </label>
        ))}
      </div>
      {(mode === 'HEADER_INJECTION' || mode === 'BOTH') && (
        <p className="text-[11px] text-fg-muted mt-3 leading-snug">
          Tip: HE campaigns usually design HOME for “number already known → Subscribe API”.
          OTP_ONLY campaigns use a different HOME that asks for PIN.
        </p>
      )}
    </div>
  )
}

export default memo(FlowStartChecksCard)
