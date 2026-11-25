import {
  pickHeFailRedirectUrl,
  isHeRedirectUrl,
  persistPhone,
} from '../../../services/flow/resolvePhoneNumber'
import {
  isApiHeProvider,
  isExternalHttpRedirect,
  isHeSilentExitMode,
  isHeSuppressedFunnelPage,
  normalizeDetectNextPage,
  shouldTreatCgAsHeFailRedirect,
} from '../flowHelpers'
import {
  buildHeMeta,
  executeHeSuccessRedirect,
} from './heRedirectHelpers'
import {
  syncUniverseDcbSession,
  updateTrackingSearchParams,
  syncPhoneToUrlParams,
  handleHeSuccessRedirectFlow,
} from './heOutcomeHandlers'

export function handleHeResolutionResult({
  result,
  cancelled,
  country,
  operator,
  campid,
  trackingCampid,
  clickIdRef,
  rcidRef,
  campidRef,
  trackingCampidRef,
  phoneRef,
  visitIdRef,
  heMetaRef,
  heOnlyModeRef,
  heExitPendingRef,
  phoneResolvingRef,
  loadPageRef,
  setPhone,
  setPhoneResolving,
  setHeExitPending,
  setHeFunnelSuppressed,
  setSearchParams,
  runFail,
}) {
  if (cancelled) return

  const {
    phone: resolved,
    failRedirectUrl,
    successRedirectUrl,
    cgRedirectUrl,
    nextPage,
    heError,
    heProvider,
    visitId: heVisitId,
    clickId: heClickId,
    rcid: heRcid,
    verificationMode,
    flowContext,
  } = result || {}

  if (heVisitId) visitIdRef.current = heVisitId
  if (heClickId) clickIdRef.current = String(heClickId)
  if (heRcid) rcidRef.current = String(heRcid)

  heMetaRef.current = buildHeMeta(result, flowContext)

  const landingCgUrl = result?.externalRedirect
  if (isExternalHttpRedirect(landingCgUrl)) {
    heOnlyModeRef.current = true
    setHeFunnelSuppressed(true)
    heExitPendingRef.current = true
    setHeExitPending(true)
    console.log('[CG] landing redirect (skip HOME)', landingCgUrl)
    window.location.replace(landingCgUrl)
    return
  }

  const detectedNextPage = normalizeDetectNextPage(nextPage)
  const mode = heMetaRef.current.verificationMode
  const cgAsHeFail = shouldTreatCgAsHeFailRedirect(mode) ? cgRedirectUrl : ''

  const silentExit =
    isApiHeProvider(heProvider) &&
    detectedNextPage !== 'OTP' &&
    isHeSilentExitMode({
      phone: resolved,
      successRedirectUrl,
      failRedirectUrl,
      cgRedirectUrl: cgAsHeFail,
      verificationMode: mode,
    })

  heOnlyModeRef.current = silentExit
  setHeFunnelSuppressed(silentExit)

  if (!resolved) {
    if (detectedNextPage !== 'OTP') {
      const baseFailUrl = pickHeFailRedirectUrl({
        failRedirectUrl,
        cgRedirectUrl: cgAsHeFail,
      })
      if (runFail(baseFailUrl, heError)) return
    }
    if (detectedNextPage) {
      heOnlyModeRef.current = false
      setHeFunnelSuppressed(false)
      phoneResolvingRef.current = false
      setPhoneResolving(false)
      setHeExitPending(false)
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          if (nextParams.get('step') === detectedNextPage) return prev
          nextParams.set('step', detectedNextPage)
          return nextParams
        },
        { replace: true },
      )
      window.setTimeout(() => {
        loadPageRef.current?.(detectedNextPage, { direct: true })
      }, 0)
      return
    }
    heOnlyModeRef.current = false
    setHeFunnelSuppressed(false)
  }

  updateTrackingSearchParams(setSearchParams, { heVisitId, heClickId, heRcid })

  if (resolved) {
    syncUniverseDcbSession(country, operator, verificationMode, flowContext)
    phoneRef.current = resolved
    setPhone(resolved)
    persistPhone(resolved)

    syncPhoneToUrlParams(setSearchParams, resolved, {
      clickId: clickIdRef.current,
      rcid: rcidRef.current,
      visitId: visitIdRef.current,
    })

    if (
      detectedNextPage &&
      !(heOnlyModeRef.current && isHeSuppressedFunnelPage(detectedNextPage))
    ) {
      phoneResolvingRef.current = false
      setPhoneResolving(false)
      setHeExitPending(false)
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          if (nextParams.get('step') === detectedNextPage) return prev
          nextParams.set('step', detectedNextPage)
          return nextParams
        },
        { replace: true },
      )
      window.setTimeout(() => {
        loadPageRef.current?.(detectedNextPage, { direct: true })
      }, 0)
      return
    }

    if (
      handleHeSuccessRedirectFlow({
        successRedirectUrl,
        resolvedPhone: resolved,
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
      })
    ) {
      return
    }

    heOnlyModeRef.current = false
    setHeFunnelSuppressed(false)
    if (!cancelled) {
      phoneResolvingRef.current = false
      setPhoneResolving(false)
    }
    return
  }

  // Check prior session phone fallback
  try {
    const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
    const sessionPhone = saved ? JSON.parse(saved)?.phone : ''
    if (sessionPhone && !(isApiHeProvider(heProvider) && heError)) {
      phoneRef.current = sessionPhone
      setPhone(sessionPhone)
      persistPhone(sessionPhone)
      if (isHeRedirectUrl(successRedirectUrl)) {
        heOnlyModeRef.current = true
        setHeFunnelSuppressed(true)
        if (
          executeHeSuccessRedirect({
            destUrl: successRedirectUrl,
            msisdn: sessionPhone,
            clickId: clickIdRef.current,
            rcid: rcidRef.current,
            campid: campidRef.current || campid,
            trackingCampid: trackingCampidRef.current || trackingCampid,
            heExitPendingRef,
            setHeExitPending,
          })
        ) {
          return
        }
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
      }
      heOnlyModeRef.current = false
      setHeFunnelSuppressed(false)
      if (!cancelled) {
        phoneResolvingRef.current = false
        setPhoneResolving(false)
      }
      return
    }
  } catch {
    /* ignore storage errors */
  }

  heOnlyModeRef.current = false
  setHeFunnelSuppressed(false)
  if (!cancelled) {
    phoneResolvingRef.current = false
    setPhoneResolving(false)
  }
}
