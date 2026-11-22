import { startTransition, useCallback, useEffect } from 'react'
import { resolvePhoneNumber } from '../../services/flow/resolvePhoneNumber'
import { executeHeFailRedirect } from './he/heRedirectHelpers'
import { evaluateHeWarning } from './he/heWarning'
import { handleHeResolutionResult } from './he/heDetectionFlow'

/**
 * HE detect-msisdn resolve + HOME CTA gate (warnIfHeUnresolved).
 *
 * Product contract (token/API HE):
 * - Success/fail (or CG fail) URL set → silent exit, never flash HOME
 * - Both exit URLs empty → show HOME after detect (funnel mode)
 */
function useHeDetect({
  country,
  operator,
  campid,
  trackingCampid,
  vid,
  setSearchParams,
  setPhone,
  setPhoneResolving,
  setHeExitPending,
  setHeFunnelSuppressed,
  setError,
  phoneResolvingRef,
  heExitPendingRef,
  heMetaRef,
  heOnlyModeRef,
  heDetectSettledRef,
  detectKeyRef,
  detectInFlightRef,
  visitIdRef,
  clickIdRef,
  rcidRef,
  phoneRef,
  campidRef,
  trackingCampidRef,
  loadPageRef,
  vidRef,
}) {
  useEffect(() => {
    if ((!country || !operator) && !campid && !trackingCampid) {
      phoneResolvingRef.current = false
      heExitPendingRef.current = false
      window.setTimeout(() => {
        startTransition(() => {
          setPhoneResolving(false)
          setHeExitPending(false)
        })
      }, 0)
      return undefined
    }

    const detectKey = `${country}|${operator}|${campid}|${trackingCampid}`
    if (detectKeyRef.current !== detectKey) {
      detectKeyRef.current = detectKey
      if (!heDetectSettledRef.current) {
        detectInFlightRef.current = false
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
      }
    }
    if (heDetectSettledRef.current || detectInFlightRef.current) return undefined
    detectInFlightRef.current = true

    let cancelled = false

    const runFail = (baseFailUrl, errMsg) =>
      executeHeFailRedirect({
        baseFailUrl,
        errMsg,
        clickId: clickIdRef.current || '',
        rcid: rcidRef.current || '',
        campid: campidRef.current || campid,
        trackingCampid: trackingCampidRef.current || trackingCampid,
        heExitPendingRef,
        setHeExitPending,
        heOnlyModeRef,
        setHeFunnelSuppressed,
        phoneResolvingRef,
        setPhoneResolving,
      })

    phoneResolvingRef.current = true
    heExitPendingRef.current = false
    window.setTimeout(() => {
      if (cancelled) return
      startTransition(() => {
        setPhoneResolving(true)
        setHeExitPending(false)
      })
    }, 0)

    heMetaRef.current = {
      done: false,
      heProvider: null,
      heError: null,
      failRedirectUrl: null,
      successRedirectUrl: null,
      cgRedirectUrl: null,
      nextPage: null,
      blocked: false,
      blockReason: null,
      subscriptionStatus: null,
      isActive: false,
      verificationMode: null,
    }

    const resolveWithTimeout = Promise.race([
      resolvePhoneNumber(new URLSearchParams(window.location.search), {
        country,
        operator,
        campid,
        trackingCampid,
        vid: vidRef.current || vid || undefined,
        visitId: visitIdRef.current || undefined,
        clickId: clickIdRef.current || undefined,
        rcid: rcidRef.current || undefined,
      }),
      new Promise((resolve) => {
        setTimeout(() => resolve({ phone: '', source: 'timeout' }), 10000)
      }),
    ])

    resolveWithTimeout
      .then((result) => {
        handleHeResolutionResult({
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
        })
      })
      .catch(() => {
        heMetaRef.current = { ...heMetaRef.current, done: true }
        heOnlyModeRef.current = false
        setHeFunnelSuppressed(false)
      })
      .finally(() => {
        detectInFlightRef.current = false
        if (!cancelled) {
          heDetectSettledRef.current = true
        }
        if (!cancelled && !heExitPendingRef.current && !heOnlyModeRef.current) {
          phoneResolvingRef.current = false
          setPhoneResolving(false)
        }
      })

    return () => {
      cancelled = true
      detectInFlightRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, operator, campid, trackingCampid, setSearchParams])

  /** HOME CTA: silent-exit URLs still redirect; empty exit URLs allow funnel. */
  const warnIfHeUnresolved = useCallback(() => {
    return evaluateHeWarning({
      meta: heMetaRef.current,
      phoneResolving: phoneResolvingRef.current,
      phone: phoneRef.current,
      clickId: clickIdRef.current,
      rcid: rcidRef.current,
      campid: campidRef.current || campid,
      trackingCampid: trackingCampidRef.current || trackingCampid,
      setSearchParams,
      loadPageRef,
      setError,
    })
  }, [
    campid,
    trackingCampid,
    setSearchParams,
    setError,
    heMetaRef,
    phoneResolvingRef,
    phoneRef,
    clickIdRef,
    rcidRef,
    campidRef,
    trackingCampidRef,
    loadPageRef,
  ])

  return { warnIfHeUnresolved }
}

export { useHeDetect }
