import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Workflow, GitBranch, Lock, Unlock } from 'lucide-react'
import Button from '../ui/Button'
import { PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import { orangeBfPageLabel } from './builder/builderUtils'
import {
  VERIFICATION_MODES,
  normalizeModeId,
  buildDefaultFlow,
  buildFlowPathSummary,
  resolveAfterIdentityTarget,
  isApiExposeEntry,
  isNullIdentityMode,
} from './verificationModes'
import { campaignFlowPath, resolveMarketCodes } from '../../utils/routes'
import FlowModeOptions from './summary/FlowModeOptions'
import FlowPathVisualizer from './summary/FlowPathVisualizer'

function resolveSavedEntry(flowConfig) {
  const entry = String(flowConfig?.entryPage || 'HOME').toUpperCase()
  if (entry === 'API_EXPOSE') return 'API_EXPOSE'
  if (entry === 'OTP') return 'OTP'
  return 'HOME'
}

/**
 * Mode picker + read-only signup path on Campaign Detail.
 * Advanced edge remaps live in Flow Builder (/flow).
 */
function CampaignFlowSummary({ campaign, onSaveMode }) {
  const currentMode = normalizeModeId(campaign?.verificationMode)
  const savedEntry = resolveSavedEntry(campaign?.flowConfig)
  const savedAfterIdentity = resolveAfterIdentityTarget(campaign?.flowConfig)
  const savedLocked = Boolean(campaign?.flowConfig?.isLocked ?? (currentMode === 'ORANGE_BF'))
  const [isLocked, setIsLocked] = useState(savedLocked)
  const [draftMode, setDraftMode] = useState(currentMode)
  const [draftEntry, setDraftEntry] = useState(savedEntry)
  const [draftAfterIdentity, setDraftAfterIdentity] = useState(savedAfterIdentity)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDraftMode(currentMode)
      setDraftEntry(savedEntry)
      setDraftAfterIdentity(savedAfterIdentity)
      setIsLocked(Boolean(campaign?.flowConfig?.isLocked ?? (currentMode === 'ORANGE_BF')))
    }, 0)
    return () => clearTimeout(timer)
  }, [campaign?.id, currentMode, savedEntry, savedAfterIdentity, campaign?.flowConfig?.isLocked])

  const previewConfig = useMemo(() => {
    if (
      draftMode === currentMode &&
      draftEntry === savedEntry &&
      draftAfterIdentity === savedAfterIdentity
    ) {
      return campaign?.flowConfig || null
    }
    return buildDefaultFlow(draftMode, {
      entryPage:
        draftMode === 'OTP_ONLY' || draftMode === 'UNIVERSE_DCB' ? draftEntry : 'HOME',
      afterIdentity: isApiExposeEntry(draftEntry) ? 'HOME' : draftAfterIdentity,
    })
  }, [
    draftMode,
    currentMode,
    draftEntry,
    savedEntry,
    draftAfterIdentity,
    savedAfterIdentity,
    campaign?.flowConfig,
  ])

  const summary = useMemo(
    () =>
      buildFlowPathSummary(draftMode, previewConfig, {
        cgRedirectUrl: campaign?.cgRedirectUrl,
      }),
    [draftMode, previewConfig, campaign?.cgRedirectUrl],
  )

  const dirty =
    draftMode !== currentMode ||
    ((draftMode === 'OTP_ONLY' || draftMode === 'UNIVERSE_DCB') &&
      draftEntry !== savedEntry) ||
    (!isApiExposeEntry(draftEntry) &&
      draftMode !== 'NONE' &&
      draftMode !== 'CG_HOME' &&
      draftMode !== 'UNIVERSE_DCB' &&
      draftAfterIdentity !== savedAfterIdentity)

  const handleToggleLock = async () => {
    const nextLocked = !isLocked
    setIsLocked(nextLocked)
    if (onSaveMode) {
      setSaving(true)
      try {
        const currentConfig = campaign?.flowConfig || buildDefaultFlow(currentMode)
        await onSaveMode({
          verificationMode: currentMode,
          flowConfig: { ...currentConfig, isLocked: nextLocked },
        })
      } finally {
        setSaving(false)
      }
    }
  }

  const handleModeChange = (nextMode) => {
    if (isLocked) return
    setDraftMode(nextMode)
    setDraftEntry(
      nextMode === 'OTP_ONLY' || nextMode === 'UNIVERSE_DCB' ? 'OTP' : 'HOME',
    )
    setDraftAfterIdentity('HOME')
  }

  const handleSave = async () => {
    if (!dirty || !onSaveMode || isLocked) return
    setSaving(true)
    try {
      const flowConfig = {
        ...buildDefaultFlow(draftMode, {
          entryPage:
            draftMode === 'OTP_ONLY' || draftMode === 'UNIVERSE_DCB'
              ? draftEntry
              : 'HOME',
          afterIdentity: isApiExposeEntry(draftEntry) ? 'HOME' : draftAfterIdentity,
        }),
        isLocked,
      }
      await onSaveMode({ verificationMode: draftMode, flowConfig })
    } finally {
      setSaving(false)
    }
  }

  const labelFor = (pageType) => {
    if (draftMode === 'ORANGE_BF') {
      return orangeBfPageLabel(pageType)
    }
    return PAGE_TYPE_LABELS[pageType] || pageType
  }
  const { countryCode, operatorCode } = resolveMarketCodes({}, campaign)
  const advancedPath = campaignFlowPath(countryCode, operatorCode, campaign?.id)
  const showOtpApiExposeDocs = draftMode === 'OTP_ONLY' && isApiExposeEntry(draftEntry)
  const showDcbApiExposeDocs = draftMode === 'UNIVERSE_DCB' && isApiExposeEntry(draftEntry)
  const showApiExposeDocs = showOtpApiExposeDocs || showDcbApiExposeDocs

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <Workflow className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-fg">Subscription flow</h2>
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Unlock className="w-3 h-3" /> Editable
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Pick how the Subscribe CTA moves between pages. Canvas button “When clicked”
                  (page / URL / Priority) can override this for individual buttons.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleLock}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  {isLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-600" />
                      Unlock Flow
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Lock Flow
                    </>
                  )}
                </Button>
                {campaign?.id && !showApiExposeDocs && (
                  isLocked ? (
                    <span
                      title="Flow is locked. Unlock above to edit the path."
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted opacity-50 cursor-not-allowed pt-0.5"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Edit advanced path
                    </span>
                  ) : (
                    <Link
                      to={advancedPath}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline shrink-0 pt-0.5"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Edit advanced path
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>This flow is <strong>locked</strong> against accidental changes. Click <strong>Unlock Flow</strong> above to modify.</span>
          </div>
        </div>
      )}

      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-fg mb-2">Verification mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VERIFICATION_MODES.map((m) => {
              const selected = draftMode === m.id
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

        <FlowModeOptions
          draftMode={draftMode}
          draftEntry={draftEntry}
          setDraftEntry={setDraftEntry}
          draftAfterIdentity={draftAfterIdentity}
          setDraftAfterIdentity={setDraftAfterIdentity}
          isLocked={isLocked}
        />

        {dirty && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-warning">
              Saving resets the signup path to the default for this mode
              {draftMode === 'OTP_ONLY'
                ? isApiExposeEntry(draftEntry)
                  ? ' (API expose — mediator only)'
                  : ` (${draftEntry} landing → ${draftAfterIdentity === 'THANKYOU' ? 'Thank you' : 'HOME'})`
                : draftMode === 'UNIVERSE_DCB'
                  ? isApiExposeEntry(draftEntry)
                    ? ' (DCB API expose — billing PIN APIs only)'
                    : ' (WAP funnel)'
                  : isNullIdentityMode(draftMode)
                    ? ''
                    : ` (${draftAfterIdentity === 'THANKYOU' ? 'skip HOME' : 'HOME packs'})`}
              .
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save flow'}
            </Button>
          </div>
        )}

        <FlowPathVisualizer
          summary={summary}
          labelFor={labelFor}
          funnelLayout={campaign?.funnelLayout}
        />
      </div>
    </div>
  )
}

export default memo(CampaignFlowSummary)
