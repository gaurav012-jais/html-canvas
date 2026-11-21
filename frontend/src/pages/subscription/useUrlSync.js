import { useEffect } from 'react'
import { isExternalHttpRedirect, isHeSuppressedFunnelPage } from './flowHelpers'
import { trackEvent, trackGoogleAdsConversion } from '../../utils/tracking'

export function useUrlSync({
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
}) {
  // Null-flow CG: backend sends externalRedirect with click_id → leave immediately
  useEffect(() => {
    const dest = String(pageData?.externalRedirect || '').trim()
    if (isExternalHttpRedirect(dest) || dest.startsWith('/subscription')) {
      window.location.assign(dest)
    }
  }, [pageData?.externalRedirect])

  // THANKYOU → optional success/content portal
  useEffect(() => {
    if (String(pageData?.pageType || '').toUpperCase() !== 'THANKYOU') return undefined
    if (String(pageData?.successRedirectMode || 'thankyou').toLowerCase() === 'immediate') {
      return undefined
    }
    const dest = String(pageData?.successRedirect || pageData?.successRedirectUrl || '').trim()
    if (!dest || !/^https?:\/\//i.test(dest)) return undefined
    const timer = window.setTimeout(() => {
      window.location.assign(dest)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [pageData?.pageType, pageData?.successRedirect, pageData?.successRedirectUrl, pageData?.successRedirectMode])

  // Sync step changes from browser history / page-link navigation.
  const urlStep = (searchParams.get('step') || '').toUpperCase()
  useEffect(() => {
    if (booting || !pageData) return
    if (!urlStep) return
    const pageType = String(pageData.pageType || '').toUpperCase()
    if (pageType === urlStep) {
      if (appStepRef.current === urlStep) appStepRef.current = null
      return
    }
    if (heOnlyModeRef.current && isHeSuppressedFunnelPage(urlStep)) return
    if (transitionLockRef.current) return
    if (appStepRef.current && appStepRef.current !== urlStep) return
    setBooting(true)
    loadPage(urlStep)
  }, [urlStep, booting, pageData, loadPage, appStepRef, heOnlyModeRef, transitionLockRef, setBooting])

  // Track Page Views
  useEffect(() => {
    if (!pageData?.pageType) return
    if (pageData.pageType === 'CONFIRM') {
      trackEvent('confirm_loaded')
    } else if (pageData.pageType === 'THANKYOU') {
      trackEvent('success_loaded')
      trackGoogleAdsConversion({
        transactionId: visitIdRef?.current || searchParams?.get('rcid') || searchParams?.get('click_id') || '',
        value: selectedPackRef?.current?.price ?? 1.0,
        currency: 'INR',
        isPreview: Boolean(searchParams?.get('_t') || searchParams?.get('preview')),
      })
    }
  }, [pageData?.pageType, searchParams, selectedPackRef, visitIdRef])
}
