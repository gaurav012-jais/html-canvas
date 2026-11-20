import { useCallback, useEffect } from 'react'
import { fetchFlowEntry, fetchFlowPage } from '../../services/api/flow'
import { pickHeFailRedirectUrl } from '../../services/flow/resolvePhoneNumber'
import { FLOW_PAGE_CACHE_ENABLED } from './constants'
import {
  isHeSuppressedFunnelPage,
  normalizeDetectNextPage,
  shouldTreatCgAsHeFailRedirect,
} from './flowHelpers'

export function useFlowBoot({
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
}) {
  const loadPage = useCallback(
    async (page = 'HOME', options = {}) => {
      const requested =
        String(page || 'HOME')
          .trim()
          .toUpperCase() || 'HOME'
      if (!country || !operator) {
        setError('Missing country or operator in URL')
        setBooting(false)
        return
      }
      if (heOnlyModeRef.current && isHeSuppressedFunnelPage(requested)) {
        console.log('[HE] suppressing funnel page load:', requested)
        phoneResolvingRef.current = true
        setPhoneResolving(true)
        setBooting(false)
        return
      }
      setError('')
      const generation = ++loadGenerationRef.current

      if (FLOW_PAGE_CACHE_ENABLED && !options.direct && pageCacheRef.current.has(requested)) {
        const cachedData = pageCacheRef.current.get(requested)
        if (generation !== loadGenerationRef.current) return
        pageDataRef.current = cachedData
        setPageData(cachedData)
        setBooting(false)
        return
      }

      try {
        const data = await fetchFlowPage({
          country,
          operator,
          page: requested,
          msisdn: phoneRef.current,
          visitId: visitIdRef.current,
          campid,
          trackingCampid,
          vid,
          affId,
          clickId: clickIdRef.current || undefined,
          rcid: rcidRef.current || undefined,
          direct: Boolean(options.direct),
        })
        if (generation !== loadGenerationRef.current) return
        cachePage(data)
      } catch (err) {
        if (generation !== loadGenerationRef.current) return
        setError(err.message || 'Failed to load page')
      } finally {
        if (generation === loadGenerationRef.current) {
          setBooting(false)
        }
      }
    },
    [country, operator, cachePage, campid, trackingCampid, vid, affId, setPhoneResolving, setError, setBooting, setPageData, phoneRef, phoneResolvingRef, visitIdRef, pageCacheRef, pageDataRef, heOnlyModeRef, loadGenerationRef, clickIdRef, rcidRef]
  )

  useEffect(() => {
    loadPageRef.current = loadPage
  }, [loadPage, loadPageRef])

  useEffect(() => {
    if ((!country || !operator) && !campid && !trackingCampid) return undefined
    let cancelled = false

    async function waitForHeDetect(maxMs = 12000) {
      const start = Date.now()
      while (!heDetectSettledRef.current && Date.now() - start < maxMs) {
        if (cancelled || heExitPendingRef.current) return false
        await new Promise((resolve) => {
          window.setTimeout(resolve, 40)
        })
      }
      return heDetectSettledRef.current
    }

    async function boot() {
      const landingParams = new URLSearchParams(window.location.search)
      const urlStep = landingParams.get('step')
      const explicitPagePreview = Boolean(urlStep) && landingParams.has('_t')

      if (explicitPagePreview) {
        setBooting(true)
        if (isHeSuppressedFunnelPage(urlStep)) {
          await waitForHeDetect()
          if (cancelled || heExitPendingRef.current || heOnlyModeRef.current) return
        }
        if (!cancelled) await loadPageRef.current?.(urlStep)
        return
      }

      selectedPackRef.current = 'daily'
      pageCacheRef.current.clear()
      prefetchingRef.current.clear()
      pageDataRef.current = null
      setPageData(null)
      setBooting(true)

      await waitForHeDetect()
      if (cancelled || heExitPendingRef.current) return
      const meta = heMetaRef.current
      const detectPage = normalizeDetectNextPage(meta.nextPage)
      if (
        !phoneRef.current &&
        detectPage !== 'OTP' &&
        pickHeFailRedirectUrl({
          failRedirectUrl: meta.failRedirectUrl,
          cgRedirectUrl: shouldTreatCgAsHeFailRedirect(meta.verificationMode)
            ? meta.cgRedirectUrl
            : '',
        })
      ) {
        return
      }
      if (heOnlyModeRef.current) return

      try {
        if (detectPage) {
          entryPageRef.current = detectPage
          await loadPageRef.current?.(detectPage)
          return
        }
        const { entryPage } = await fetchFlowEntry({ country, operator, campid, trackingCampid })
        if (cancelled || heExitPendingRef.current || heOnlyModeRef.current) return
        entryPageRef.current = entryPage || 'HOME'
        await loadPageRef.current?.(entryPageRef.current)
      } catch {
        if (!cancelled && !heExitPendingRef.current && !heOnlyModeRef.current) {
          await loadPageRef.current?.(detectPage || 'HOME')
        }
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [country, operator, campid, trackingCampid, setBooting, setPageData, selectedPackRef, pageCacheRef, prefetchingRef, pageDataRef, heDetectSettledRef, heExitPendingRef, heMetaRef, phoneRef, heOnlyModeRef, entryPageRef, loadPageRef])

  return { loadPage }
}
