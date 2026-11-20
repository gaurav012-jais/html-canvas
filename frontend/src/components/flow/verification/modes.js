/**
 * Verification modes definitions and identity predicate helpers.
 */

export const VERIFICATION_MODES = [
  {
    id: 'HEADER_INJECTION',
    label: 'Header Injection',
    hint: 'Resolve number from carrier header / ISP, then HOME. If missing → Error page.',
    pathHint: 'HE → HOME (packs) / Error (no HE) → outcomes',
  },
  {
    id: 'OTP_ONLY',
    label: 'OTP only',
    hint: 'No landing HE. OTP first (or HOME first), then HOME pack CTAs — or expose public send/verify APIs.',
    pathHint: 'OTP → HOME (or HOME → OTP → HOME), or skip HOME → Thank you',
  },
  {
    id: 'BOTH',
    label: 'Header Injection + OTP',
    hint: 'HE first. Hit → HOME. Miss → OTP → HOME.',
    pathHint: 'HE → HOME / OTP → HOME → outcomes',
  },
  {
    id: 'UNIVERSE_DCB',
    label: 'Universe Telecom DCB',
    hint: 'WAP funnel with PIN + pack, or API expose for vendor billing PIN send/confirm (no pages).',
    pathHint: 'No HE: number → packs → PIN. HE: packs → PIN → polling. Or public pincode/confirm APIs',
  },
  {
    id: 'ORANGE_BF',
    label: 'Orange Burkina Faso',
    hint: 'Multi-step French VAS flow for Orange BF (+226) with CheckSub auto-forward, Auth OTP & async Unsub.',
    pathHint: 'HOME (number) → CONFIRM (plan + send OTP) → OTP (verify) → THANKYOU',
    isLocked: true,
  },
  {
    id: 'NONE',
    label: 'None (null / CG redirect)',
    hint: 'No HE/OTP. If a CG URL is set → redirect there on landing with click_id.',
    pathHint: 'Landing → CG redirect (if URL set), else HOME only',
  },
  {
    id: 'CG_HOME',
    label: 'CG via HOME (no HE)',
    hint: 'No HE/OTP. Show HOME first. Subscribe redirects to CG URL with click_id.',
    pathHint: 'HOME → Subscribe → CG redirect (click_id)',
  },
]

export function normalizeModeId(mode) {
  if (mode === 'MSISDN_ONLY') return 'HEADER_INJECTION'
  if (mode === 'NULL' || mode === null || mode === undefined || mode === '') return 'BOTH'
  return mode || 'BOTH'
}

/** No HE/OTP — CG URL carries click_id (landing or subscribe). */
export function isNullIdentityMode(mode) {
  const m = normalizeModeId(mode)
  return m === 'NONE' || m === 'CG_HOME'
}

/** Landing goes straight to CG (no HOME). */
export function isLandingCgMode(mode) {
  return normalizeModeId(mode) === 'NONE'
}

/** HOME first, then Subscribe CTA → CG. */
export function isCgHomeMode(mode) {
  return normalizeModeId(mode) === 'CG_HOME'
}

/** True when OTP_ONLY campaign is API-mediator only (no WAP pages). */
export function isApiExposeEntry(entryPage) {
  return String(entryPage || '').toUpperCase() === 'API_EXPOSE'
}

export function isApiExposeCampaign(campaign) {
  const mode = normalizeModeId(campaign?.verificationMode)
  return (
    (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') &&
    isApiExposeEntry(campaign?.flowConfig?.entryPage)
  )
}

export function isDcbApiExposeCampaign(campaign) {
  return (
    normalizeModeId(campaign?.verificationMode) === 'UNIVERSE_DCB' &&
    isApiExposeEntry(campaign?.flowConfig?.entryPage)
  )
}

export function isOtpApiExposeCampaign(campaign) {
  return (
    normalizeModeId(campaign?.verificationMode) === 'OTP_ONLY' &&
    isApiExposeEntry(campaign?.flowConfig?.entryPage)
  )
}

/** HOME = pack canvas after identity. THANKYOU = skip HOME. */
export function normalizeAfterIdentity(afterIdentity, afterOtp) {
  const raw = String(afterIdentity || afterOtp || 'HOME').toUpperCase()
  if (raw === 'THANKYOU') return 'THANKYOU'
  return 'HOME'
}
