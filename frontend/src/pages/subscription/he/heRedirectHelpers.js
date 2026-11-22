import {
  appendHeAttributionToUrl,
} from '../../../services/flow/resolvePhoneNumber'
import {
  normalizeDetectNextPage,
} from '../flowHelpers'

export function buildHeMeta(result, flowContext) {
  const {
    failRedirectUrl,
    successRedirectUrl,
    cgRedirectUrl,
    nextPage,
    blocked,
    blockReason,
    subscriptionStatus,
    isActive,
    heError,
    heProvider,
    verificationMode,
  } = result || {}

  return {
    done: true,
    heProvider: heProvider || null,
    heError: heError || null,
    failRedirectUrl: failRedirectUrl || null,
    successRedirectUrl: successRedirectUrl || null,
    cgRedirectUrl: cgRedirectUrl || null,
    nextPage: normalizeDetectNextPage(nextPage),
    blocked: Boolean(blocked),
    blockReason: blockReason || null,
    subscriptionStatus: subscriptionStatus || null,
    isActive: Boolean(isActive),
    verificationMode:
      String(verificationMode || flowContext?.verificationMode || '').toUpperCase() || null,
  }
}

export function executeHeFailRedirect({
  baseFailUrl,
  errMsg,
  clickId,
  rcid,
  campid,
  trackingCampid,
  heExitPendingRef,
  setHeExitPending,
  heOnlyModeRef,
  setHeFunnelSuppressed,
  phoneResolvingRef,
  setPhoneResolving,
}) {
  if (!baseFailUrl) return false

  const dest = appendHeAttributionToUrl(baseFailUrl, {
    msisdn: '',
    clickId: clickId || '',
    rcid: rcid || '',
    campid,
    trackingCampid,
  })

  if (!dest) {
    if (heExitPendingRef) heExitPendingRef.current = false
    setHeExitPending(false)
    if (heOnlyModeRef) heOnlyModeRef.current = false
    setHeFunnelSuppressed(false)
    if (phoneResolvingRef) phoneResolvingRef.current = false
    setPhoneResolving(false)
    return false
  }

  if (heExitPendingRef) heExitPendingRef.current = true
  setHeExitPending(true)
  console.log('[HE] no MSISDN — fail redirect (skip HOME)', { dest, heError: errMsg })
  window.location.replace(dest)
  return true
}

export function executeHeSuccessRedirect({
  destUrl,
  msisdn,
  clickId,
  rcid,
  campid,
  trackingCampid,
  heExitPendingRef,
  setHeExitPending,
}) {
  if (!destUrl) return false
  const dest = appendHeAttributionToUrl(destUrl, {
    msisdn,
    clickId: clickId || '',
    rcid: rcid || '',
    campid,
    trackingCampid,
  })
  if (!dest) return false

  if (heExitPendingRef) heExitPendingRef.current = true
  setHeExitPending(true)
  console.log('[HE] MSISDN resolved — success redirect (skip HOME)', { dest, msisdn })
  window.location.replace(dest)
  return true
}
