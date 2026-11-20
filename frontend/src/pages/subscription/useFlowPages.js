import { useCallback, useRef } from 'react'
import { persistPhone } from '../../services/flow/resolvePhoneNumber'
import { isHeSuppressedFunnelPage, isExternalHttpRedirect } from './flowHelpers'
import { usePageCache } from './usePageCache'
import { useUrlSync } from './useUrlSync'
import { useFlowBoot } from './useFlowBoot'

/**
 * Page load/cache/prefetch, boot, URL step sync, and redirect side-effects.
 * Composes specialized hooks: usePageCache, useUrlSync, and useFlowBoot.
 */
function useFlowPages({
  country,
  operator,
  campid,
  trackingCampid,
  vid,
  affId,
  searchParams,
  setSearchParams,
  setPhone,
  setPhoneResolving,
  setBooting,
  setError,
  setPageData,
  pageData,
  booting,
  saveSession,
  phoneRef,
  phoneResolvingRef,
  visitIdRef,
  entryPageRef,
  pageCacheRef,
  prefetchingRef,
  pageDataRef,
  selectedPackRef,
  heOnlyModeRef,
  heDetectSettledRef,
  heExitPendingRef,
  heMetaRef,
  loadGenerationRef,
  clickIdRef,
  rcidRef,
  vidRef,
  affIdRef,
  campidRef,
  trackingCampidRef,
  loadPageRef,
  transitionLockRef,
}) {
  const appStepRef = useRef(null)

  const cachePage = useCallback(
    (data) => {
      const leaveUrl = String(data?.externalRedirect || '').trim()
      if (isExternalHttpRedirect(leaveUrl) || leaveUrl.startsWith('/subscription')) {
        if (data.visitId) visitIdRef.current = data.visitId
        if (data.clickId) clickIdRef.current = String(data.clickId)
        if (data.rcid) rcidRef.current = String(data.rcid)
        window.location.assign(leaveUrl)
        return
      }

      if (!data?.pageType) return
      if (heOnlyModeRef.current && isHeSuppressedFunnelPage(data.pageType)) {
        console.log('[HE] suppressing funnel page render:', data.pageType)
        return
      }

      const mode = String(data.successRedirectMode || 'thankyou').toLowerCase()
      const dest = String(data.successRedirect || '').trim()
      if (
        mode === 'immediate' &&
        dest &&
        isExternalHttpRedirect(dest) &&
        String(data.pageType || '').toUpperCase() === 'THANKYOU'
      ) {
        if (data.visitId) visitIdRef.current = data.visitId
        window.location.assign(dest)
        return
      }

      if (data.entryPage) entryPageRef.current = data.entryPage
      pageCacheRef.current.set(data.pageType, data)
      if (data.visitId) visitIdRef.current = data.visitId
      pageDataRef.current = data
      appStepRef.current = String(data.pageType || '').toUpperCase()
      setPageData(data)

      if (data.clickId) clickIdRef.current = String(data.clickId)
      if (data.rcid) rcidRef.current = String(data.rcid)

      const resolvedPhone = phoneRef.current || data.variables?.phone || data.variables?.msisdn || ''
      if (resolvedPhone) {
        phoneRef.current = resolvedPhone
        setPhone(resolvedPhone)
        persistPhone(resolvedPhone)
      }

      const isVerified = data.pageType === 'CONFIRM' || data.pageType === 'THANKYOU' || data.verified === true
      saveSession({
        verificationStatus: isVerified ? 'verified' : 'unverified',
        flowId: data.campaignId,
        campaignId: data.campaignId,
        visitId: data.visitId || visitIdRef.current,
        phone: resolvedPhone,
        step: data.pageType,
        clickId: clickIdRef.current || undefined,
        rcid: rcidRef.current || undefined,
        purchaseTypeId: data.flowContext?.purchaseTypeId || undefined,
        transactionChannel: data.flowContext?.transactionChannel || undefined,
        msisdnSource: data.flowContext?.msisdnSource || undefined,
      })

      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          let changed = false
          if (nextParams.get('step') !== data.pageType) {
            nextParams.set('step', data.pageType)
            changed = true
          }
          if (resolvedPhone && !nextParams.get('msisdn')) {
            nextParams.set('msisdn', resolvedPhone)
            changed = true
          }
          const cid = clickIdRef.current
          const rid = rcidRef.current
          const v = vidRef.current
          const a = affIdRef.current
          const c = campidRef.current
          const tc = trackingCampidRef.current
          if (cid && nextParams.get('click_id') !== cid) {
            nextParams.set('click_id', cid)
            changed = true
          }
          if (rid && nextParams.get('rcid') !== rid) {
            nextParams.set('rcid', rid)
            changed = true
          }
          if (v && nextParams.get('vid') !== v) {
            nextParams.set('vid', v)
            changed = true
          }
          if (a && nextParams.get('aff_id') !== a) {
            nextParams.set('aff_id', a)
            changed = true
          }
          if (c && nextParams.get('campid') !== c) {
            nextParams.set('campid', c)
            changed = true
          }
          if (tc && nextParams.get('tracking_campid') !== tc) {
            nextParams.set('tracking_campid', tc)
            changed = true
          }
          return changed ? nextParams : prev
        },
        { replace: true }
      )
    },
    [saveSession, setSearchParams, visitIdRef, clickIdRef, rcidRef, heOnlyModeRef, entryPageRef, pageCacheRef, pageDataRef, setPageData, phoneRef, setPhone, vidRef, affIdRef, campidRef, trackingCampidRef]
  )

  const { loadPage } = useFlowBoot({
    country,
    operator,
    campid,
    trackingCampid,
    vid,
    affId,
    cachePage,
    setError,
    setBooting,
    setPageData,
    setPhoneResolving,
    phoneRef,
    phoneResolvingRef,
    visitIdRef,
    entryPageRef,
    pageCacheRef,
    prefetchingRef,
    pageDataRef,
    selectedPackRef,
    heOnlyModeRef,
    heDetectSettledRef,
    heExitPendingRef,
    heMetaRef,
    loadGenerationRef,
    clickIdRef,
    rcidRef,
    loadPageRef,
  })

  usePageCache({
    country,
    operator,
    campid,
    trackingCampid,
    vid,
    affId,
    phoneRef,
    visitIdRef,
    clickIdRef,
    rcidRef,
    pageCacheRef,
    prefetchingRef,
    pageData,
  })

  useUrlSync({
    pageData,
    searchParams,
    booting,
    loadPage,
    appStepRef,
    heOnlyModeRef,
    transitionLockRef,
    setBooting,
    visitIdRef,
    selectedPackRef,
  })

  return { cachePage, loadPage }
}

export { useFlowPages }
