import {
  isHeRedirectUrl,
  resolvePhoneFromUrl,
} from '../../../services/flow/resolvePhoneNumber'
import { isHeSuppressedFunnelPage } from '../flowHelpers'
import { executeHeSuccessRedirect } from './heRedirectHelpers'

export function syncUniverseDcbSession(country, operator, verificationMode, flowContext) {
  if (
    String(verificationMode || flowContext?.verificationMode || '').toUpperCase() ===
    'UNIVERSE_DCB'
  ) {
    try {
      const sessionKey = `tc_session_${country}_${operator}`
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          ...saved,
          msisdnSource: 'HE',
          transactionChannel: 'HE',
          ...(String(flowContext?.stage || '').toUpperCase() === 'PIN_REQUIRED'
            ? {
                dcbStage: 'PIN_REQUIRED',
                ...(flowContext?.purchaseTypeId
                  ? { purchaseTypeId: flowContext.purchaseTypeId }
                  : {}),
              }
            : {}),
        }),
      )
    } catch {
      /* best effort */
    }
  }
}

export function updateTrackingSearchParams(
  setSearchParams,
  { heVisitId, heClickId, heRcid },
) {
  if (!heVisitId && !heClickId && !heRcid) return
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev)
      let changed = false
      if (heClickId && next.get('click_id') !== String(heClickId)) {
        next.set('click_id', String(heClickId))
        changed = true
      }
      if (heRcid && next.get('rcid') !== String(heRcid)) {
        next.set('rcid', String(heRcid))
        changed = true
      }
      if (heVisitId && next.get('visitId') !== String(heVisitId)) {
        next.set('visitId', String(heVisitId))
        changed = true
      }
      return changed ? next : prev
    },
    { replace: true },
  )
}

export function syncPhoneToUrlParams(
  setSearchParams,
  phone,
  { clickId, rcid, visitId },
) {
  const currentParams = new URLSearchParams(window.location.search)
  if (!resolvePhoneFromUrl(currentParams)) {
    currentParams.set('msisdn', phone)
    if (clickId) currentParams.set('click_id', clickId)
    if (rcid) currentParams.set('rcid', rcid)
    if (visitId) currentParams.set('visitId', String(visitId))
    setSearchParams(currentParams, { replace: true })
  }
}

export function handleHeSuccessRedirectFlow({
  successRedirectUrl,
  resolvedPhone,
  clickIdRef,
  rcidRef,
  campid,
  campidRef,
  trackingCampid,
  trackingCampidRef,
  heOnlyModeRef,
  setHeFunnelSuppressed,
  heExitPendingRef,
  setHeExitPending,
}) {
  if (!isHeRedirectUrl(successRedirectUrl)) return false

  heOnlyModeRef.current = true
  setHeFunnelSuppressed(true)
  const go = () =>
    executeHeSuccessRedirect({
      destUrl: successRedirectUrl,
      msisdn: resolvedPhone,
      clickId: clickIdRef.current || '',
      rcid: rcidRef.current || '',
      campid: campidRef.current || campid,
      trackingCampid: trackingCampidRef.current || trackingCampid,
      heExitPendingRef,
      setHeExitPending,
    })

  if (clickIdRef.current) {
    go()
  } else {
    const started = Date.now()
    const tick = () => {
      if (clickIdRef.current || Date.now() - started > 2500) {
        go()
        return
      }
      window.setTimeout(tick, 150)
    }
    tick()
  }
  return true
}
