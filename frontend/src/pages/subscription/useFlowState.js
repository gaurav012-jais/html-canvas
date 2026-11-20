import { useRef } from 'react'

/**
 * Central mutable state container (refs) for the /subscription funnel.
 * Eliminates 20+ separate useRef declarations in SubscriptionPage and
 * simplifies passing flow state across hooks.
 */
export function useFlowState(initial = {}) {
  const hostRef = useRef(null)
  const visitIdRef = useRef(null)
  const entryPageRef = useRef('HOME')
  const pageCacheRef = useRef(new Map())
  const prefetchingRef = useRef(new Set())
  const transitionLockRef = useRef(false)
  const pageDataRef = useRef(null)
  const selectedPackRef = useRef('daily')
  const phoneRef = useRef('')
  const phoneResolvingRef = useRef(true)
  const heExitPendingRef = useRef(false)
  const heMetaRef = useRef({
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
  })
  const loadPageRef = useRef(null)
  const detectKeyRef = useRef('')
  const detectInFlightRef = useRef(false)
  const heDetectSettledRef = useRef(false)
  const heOnlyModeRef = useRef(false)
  const loadGenerationRef = useRef(0)

  // Tracking & attribution refs
  const clickIdRef = useRef('')
  const rcidRef = useRef(initial.urlRcid || initial.urlClickId || '')
  const vidRef = useRef(initial.vid || '')
  const affIdRef = useRef(initial.affId || '')
  const campidRef = useRef(initial.campid || '')
  const trackingCampidRef = useRef(initial.trackingCampid || '')

  return {
    hostRef,
    visitIdRef,
    entryPageRef,
    pageCacheRef,
    prefetchingRef,
    transitionLockRef,
    pageDataRef,
    selectedPackRef,
    phoneRef,
    phoneResolvingRef,
    heExitPendingRef,
    heMetaRef,
    loadPageRef,
    detectKeyRef,
    detectInFlightRef,
    heDetectSettledRef,
    heOnlyModeRef,
    loadGenerationRef,
    clickIdRef,
    rcidRef,
    vidRef,
    affIdRef,
    campidRef,
    trackingCampidRef,
  }
}
