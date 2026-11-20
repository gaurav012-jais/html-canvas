/**
 * Flow summary and path traversal logic for verification modes.
 */

import { VERIFICATION_MODES, normalizeModeId, isApiExposeEntry } from './modes'
import { DEFAULT_FLOWS } from './layouts'

export const CONDITION_LABELS = {
  DEFAULT: 'default',
  HEADER_RESOLVED: 'HE ok',
  HEADER_UNRESOLVED: 'no HE',
  OTP_VERIFIED: 'OTP ok',
  OTP_SENT: 'OTP sent',
  ACTIVE_SUBSCRIBER: 'already subscribed',
  SUBSCRIBE: 'subscribe',
  MSISDN_CHECKED: 'then choose pack',
  PIN_REQUESTED: 'then enter PIN',
  PIN_CONFIRMED: 'then wait for activation',
  ENTITLED: 'already active',
  ACTIVATED: 'activated',
  SUBSCRIBED: 'subscribed',
  PENDING: 'pending',
  LOW_BALANCE: 'low balance',
  BLOCKED: 'blocked',
  ERROR: 'error',
}

export function resolveEntryPage(config) {
  const wanted = String(config?.entryPage || '').toUpperCase()
  if (wanted === 'API_EXPOSE') return 'API_EXPOSE'
  const nodes = config?.nodes || []
  if (!nodes.length) return 'HOME'
  if (wanted && nodes.some((n) => n.pageType === wanted)) return wanted
  if (nodes.some((n) => n.pageType === 'HOME')) return 'HOME'
  return nodes[0].pageType
}

/** Infer post-identity target: HOME (packs) | THANKYOU (skip HOME) | CONFIRM (legacy). */
export function resolveAfterIdentityTarget(flowConfig) {
  const edges = flowConfig?.edges || []
  const otpVerified = edges.find(
    (e) => (e.source === 'OTP' || e.source === 'otp') && String(e.condition || '').toUpperCase() === 'OTP_VERIFIED'
  )
  if (otpVerified) {
    const target = String(otpVerified.target || '').toUpperCase()
    if (target === 'THANKYOU' || target === 'HOME' || target === 'CONFIRM') return target
  }
  const heResolved = edges.find(
    (e) => (e.source === 'HOME' || e.source === 'home') && String(e.condition || '').toUpperCase() === 'HEADER_RESOLVED'
  )
  if (heResolved) {
    const target = String(heResolved.target || '').toUpperCase()
    if (target === 'THANKYOU' || target === 'HOME' || target === 'CONFIRM') return target
  }
  const hasConfirm = (flowConfig?.nodes || []).some((n) => n.pageType === 'CONFIRM' || n.id === 'CONFIRM')
  return hasConfirm ? 'CONFIRM' : 'HOME'
}

/** @deprecated use resolveAfterIdentityTarget */
export function resolveAfterOtpTarget(flowConfig) {
  const target = resolveAfterIdentityTarget(flowConfig)
  return target === 'THANKYOU' ? 'THANKYOU' : target === 'HOME' ? 'HOME' : target
}

/**
 * Build a compact read-only path for Campaign Detail.
 * Prefers saved flowConfig edges; falls back to DEFAULT_FLOWS for the mode.
 */
export function buildFlowPathSummary(verificationMode, flowConfig, { cgRedirectUrl } = {}) {
  const mode = normalizeModeId(verificationMode)
  const modeMeta = VERIFICATION_MODES.find((m) => m.id === mode) || VERIFICATION_MODES.find((m) => m.id === 'BOTH')

  if (mode === 'OTP_ONLY' && isApiExposeEntry(flowConfig?.entryPage)) {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'API_EXPOSE',
      steps: [
        { id: 'expose_send', label: 'OTP send API' },
        { id: 'expose_verify', label: 'OTP verify API' },
      ],
      edges: [],
      note: 'API mediator only — no WAP pages. External clients call the exposed send/verify URLs.',
    }
  }

  if (mode === 'UNIVERSE_DCB' && isApiExposeEntry(flowConfig?.entryPage)) {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'API_EXPOSE',
      steps: [
        { id: 'dcb_pincode', label: 'Billing PIN request API' },
        { id: 'dcb_confirm', label: 'Billing PIN confirm API' },
        { id: 'dcb_status', label: 'Status poll API' },
      ],
      edges: [],
      note: 'DCB API mediator only — no WAP pages. Vendors call pincode / confirm / status with vendor ID in the path.',
    }
  }

  const config = flowConfig?.nodes?.length ? flowConfig : DEFAULT_FLOWS[mode] || DEFAULT_FLOWS.BOTH

  if (mode === 'NONE') {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'HOME',
      steps: cgRedirectUrl
        ? [
            { id: 'land', label: 'Landing' },
            { id: 'cg', label: 'CG redirect', condition: 'external URL' },
          ]
        : [
            { id: 'HOME', label: 'HOME' },
            { id: 'stay', label: 'Stay (no CG URL)', condition: 'null-flow' },
          ],
      edges: [],
      note: 'Canvas buttons can still jump to a page or URL if you show HOME.',
    }
  }

  if (mode === 'CG_HOME') {
    return {
      mode,
      modeLabel: modeMeta.label,
      modeHint: modeMeta.hint,
      entryPage: 'HOME',
      steps: cgRedirectUrl
        ? [
            { id: 'HOME', label: 'HOME' },
            { id: 'cg', label: 'CG redirect', condition: 'subscribe + click_id' },
          ]
        : [
            { id: 'HOME', label: 'HOME' },
            { id: 'stay', label: 'Stay (no CG URL)', condition: 'null-flow' },
          ],
      edges: [],
      note: 'No HE. User sees HOME; Subscribe sends them to CG URL with click_id.',
    }
  }

  const entryPage = resolveEntryPage(config)
  const nodesById = Object.fromEntries((config.nodes || []).map((n) => [n.id, n]))
  const pageLabel = (id) => {
    const n = nodesById[id]
    return n?.pageType || id
  }

  const prioritySources = [entryPage, 'HOME', 'OTP', 'CONFIRM'].filter((v, i, arr) => arr.indexOf(v) === i)
  const edges = []
  for (const source of prioritySources) {
    for (const e of config.edges || []) {
      if (e.source !== source) continue
      edges.push({
        source: pageLabel(e.source),
        target: pageLabel(e.target),
        condition: e.condition || 'DEFAULT',
        conditionLabel: CONDITION_LABELS[e.condition] || e.condition || 'default',
      })
    }
  }

  const steps = []
  const visited = new Set()
  const entryNode = (config.nodes || []).find((n) => n.pageType === entryPage)
  const startId = entryNode?.id || entryPage
  const queue = [startId]
  visited.add(entryPage)
  steps.push({ id: entryPage, label: entryPage })
  while (queue.length) {
    const cur = queue.shift()
    for (const e of config.edges || []) {
      if (e.source !== cur) continue
      const targetNode = nodesById[e.target]
      const type = targetNode?.pageType || e.target
      if (visited.has(type)) continue
      if (['INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR'].includes(type)) continue
      const skipToThankYou = edges.some(
        (ed) => ed.target === 'THANKYOU' && (ed.condition === 'OTP_VERIFIED' || ed.condition === 'HEADER_RESOLVED')
      )
      if (type === 'THANKYOU' && !skipToThankYou) continue
      visited.add(type)
      steps.push({ id: type, label: type })
      queue.push(e.target)
    }
  }
  if (
    !steps.some((s) => s.id === 'outcomes') &&
    (config.edges || []).some((e) => String(e.condition || '').toUpperCase() === 'SUBSCRIBED')
  ) {
    steps.push({ id: 'outcomes', label: 'outcomes' })
  }

  return {
    mode,
    modeLabel: modeMeta.label,
    modeHint: modeMeta.hint,
    entryPage,
    steps,
    edges,
    note:
      mode === 'UNIVERSE_DCB'
        ? 'Wifi: number → choose pack → PIN. HE: skip number, open packs. PIN reuses the number page.'
        : entryPage === 'OTP'
          ? 'Landing opens OTP directly. After PIN, HOME shows pack / subscribe CTAs unless Skip HOME is on.'
          : entryPage === 'API_EXPOSE'
            ? 'API mediator only — no WAP pages.'
            : 'Pack / subscribe CTAs live on HOME. Canvas “Go to page / URL / Priority” bypasses this path.',
  }
}
