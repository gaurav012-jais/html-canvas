import { useEffect, useState } from 'react'
import { transitionFlow } from '../../services/api/flow'
import { isDcbFlowContext, setupDcbBindings } from './setupDcbBindings'
import { setupOtpBindings } from './setupOtpBindings'
import { attachInputRestrictions } from '../../editor/utils/inputRestrictions'
import { mountPageInShadow, syncPackPicker, syncPhoneDisplay } from './shadowDom'
import { pickLivePageData } from '../../editor/services/deviceLayouts'
import {
  createShadowPackClickHandler,
  createShadowAnchorClickHandler,
  createShadowActionClickHandler,
} from './interactions/shadowActionRouter'

/**
 * Shadow DOM click routing (Layer C + bridge to Layer B).
 *
 * - data-action=SUBSCRIBE|CONFIRM → POST /transition (backend flow-engine / mode)
 * - data-action=SUBSCRIBE_ROUTE → partner subscribe + button destinations
 * - href=HOME|OTP|CONFIRM|… → loadPage(direct) — bypasses flow graph
 * - href=https://… → normal navigation
 * - data-actions (CHAIN) → runPriorityChain — canvas-owned status routing
 *
 * See docs/FLOW-ARCHITECTURE.md §0.1.
 */
function useShadowInteractions({
  hostRef,
  pageData,
  country,
  operator,
  campid,
  trackingCampid,
  cachePage,
  loadPage,
  setSearchParams,
  warnIfHeUnresolved,
  saveSession,
  setPhone,
  setTransitioning,
  setError,
  pageDataRef,
  selectedPackRef,
  phoneRef,
  visitIdRef,
  clickIdRef,
  rcidRef,
  campidRef,
  trackingCampidRef,
  vidRef,
  affIdRef,
  pageCacheRef,
  transitionLockRef,
}) {
  const [mobileViewport, setMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(max-width: 767px)')
    const onChange = () => setMobileViewport(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !pageData) return undefined
    const resolved = pickLivePageData(pageData, mobileViewport) || pageData
    if (!resolved.html) return undefined

    let shadow = host.shadowRoot
    if (!shadow) shadow = host.attachShadow({ mode: 'open' })
    const mountKey = [
      resolved.html,
      resolved.css,
      resolved.projectData?.customWidth || '',
      resolved.projectData?.customHeight || '',
    ].join('\0')
    if (shadow._tcMountKey !== mountKey) {
      shadow._tcMountKey = mountKey
      mountPageInShadow(shadow, pageData, { mobile: mobileViewport })
    }

    if (pageData.pageType === 'CONFIRM' || shadow.querySelector('[data-pack]')) {
      syncPackPicker(shadow, selectedPackRef.current)
      if (pageData.pageType === 'CONFIRM') {
        syncPhoneDisplay(shadow, phoneRef.current)
      }
    }

    const handlePackClick = createShadowPackClickHandler({
      shadow,
      transitionLockRef,
      selectedPackRef,
    })

    const handleAnchorClick = createShadowAnchorClickHandler({
      shadow,
      transitionLockRef,
      pageDataRef,
      warnIfHeUnresolved,
      setTransitioning,
      setError,
      loadPage,
    })

    const handleClick = createShadowActionClickHandler({
      shadow,
      country,
      operator,
      campid,
      campidRef,
      trackingCampid,
      trackingCampidRef,
      cachePage,
      loadPage,
      setSearchParams,
      warnIfHeUnresolved,
      saveSession,
      setPhone,
      setTransitioning,
      setError,
      pageDataRef,
      selectedPackRef,
      phoneRef,
      visitIdRef,
      clickIdRef,
      rcidRef,
      vidRef,
      affIdRef,
      transitionLockRef,
    })

    let flowCleanup = null
    if (isDcbFlowContext(pageData)) {
      flowCleanup = setupDcbBindings(shadow, {
        pageData,
        cachePage,
        loadPage,
        country,
        operator,
        campid,
        trackingCampid,
        visitIdRef,
        phoneRef,
        selectedPackRef,
        setPhone,
        setTransitioning,
        setError,
        saveSession,
        transitionLockRef,
      })
    } else if (
      pageData.pageType === 'OTP' ||
      Boolean(
        shadow.querySelector(
          '[data-otp-action], [data-action="send-otp"], [data-action="verify-otp"]',
        ),
      )
    ) {
      flowCleanup = setupOtpBindings(shadow, {
        transitionFlow,
        cachePage,
        loadPage,
        country,
        operator,
        campid,
        trackingCampid,
        visitIdRef,
        phoneRef,
        packRef: selectedPackRef,
        setPhone,
        setTransitioning,
        setError,
        pageCacheRef,
        transitionLockRef,
      })
    }

    const detachRestrictions = attachInputRestrictions(shadow)

    shadow.addEventListener('click', handlePackClick)
    shadow.addEventListener('click', handleClick)
    shadow.addEventListener('click', handleAnchorClick)

    return () => {
      shadow.removeEventListener('click', handlePackClick)
      shadow.removeEventListener('click', handleClick)
      shadow.removeEventListener('click', handleAnchorClick)
      if (detachRestrictions) detachRestrictions()
      if (flowCleanup) flowCleanup()
    }
  }, [
    pageData,
    mobileViewport,
    country,
    operator,
    campid,
    trackingCampid,
    cachePage,
    loadPage,
    setSearchParams,
    warnIfHeUnresolved,
  ])
}

export { useShadowInteractions }
