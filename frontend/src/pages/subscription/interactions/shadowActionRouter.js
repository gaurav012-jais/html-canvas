import {
  findActionTarget,
  hrefIsNavigationTarget,
  isCampaignPageHref,
  isExternalHttpRedirect,
} from '../flowHelpers'
import { runPriorityChain } from '../runPriorityChain'
import { executeShadowSubscribeRoute } from './shadowSubscribeRoute'
import { executeShadowTransition } from './shadowTransitionAction'

export {
  createShadowPackClickHandler,
  createShadowAnchorClickHandler,
} from './shadowDomHandlers'

export function createShadowActionClickHandler({
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
}) {
  return async (event) => {
    const hit = findActionTarget(event)
    if (!hit) return

    const { action, node } = hit
    const onHome = String(pageDataRef.current?.pageType || '').toUpperCase() === 'HOME'

    event.preventDefault()
    if (transitionLockRef.current) return
    const hrefEarly = (node.getAttribute('href') || '').trim()
    const navOnly = !action && hrefIsNavigationTarget(hrefEarly)
    if (!visitIdRef.current && !navOnly) {
      setError('Please wait a moment and try again.')
      return
    }

    if (action && action !== 'SUBSCRIBE_ROUTE' && onHome && warnIfHeUnresolved()) {
      return
    }

    // Handle Sequential Action Chain (Priority Flow)
    if (action === 'CHAIN' || node.hasAttribute('data-actions')) {
      let actions = []
      try {
        actions = JSON.parse(node.getAttribute('data-actions') || '[]')
      } catch (e) {
        console.error('[Priority Chain] FAIL — Invalid data-actions JSON:', e)
      }

      if (actions.length > 0) {
        transitionLockRef.current = true
        setTransitioning(true)
        setError('')

        try {
          await runPriorityChain({
            actions,
            node,
            shadow,
            country,
            operator,
            phoneRef,
            visitIdRef,
            clickIdRef,
            rcidRef,
            pageDataRef,
            saveSession,
            setSearchParams,
            loadPage,
            cachePage,
            setError,
          })
        } finally {
          setTransitioning(false)
          transitionLockRef.current = false
        }
        return
      }
    }

    // Reconfigured Subscribe/Confirm (or freeform CTA): page / URL / anchor via href
    if (!node.getAttribute('data-action') && !node.hasAttribute('data-actions')) {
      const href = (node.getAttribute('href') || '').trim()

      if (isCampaignPageHref(href)) {
        const targetPage = href.toUpperCase()
        if (String(pageDataRef.current?.pageType || '').toUpperCase() === targetPage) return
        if (onHome && warnIfHeUnresolved()) return
        transitionLockRef.current = true
        setTransitioning(true)
        setError('')
        try {
          await loadPage(targetPage, { direct: true })
        } finally {
          setTransitioning(false)
          transitionLockRef.current = false
        }
        return
      }

      if (href.startsWith('#') && href !== '#') {
        const targetId = decodeURIComponent(href.slice(1))
        const targetEl = shadow.getElementById(targetId)
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return
      }

      if (/^(https?:|mailto:|tel:)/i.test(href)) {
        const target = node.getAttribute('target') || '_self'
        if (target === '_blank') {
          window.open(href, '_blank', 'noopener,noreferrer')
        } else {
          window.location.assign(href)
        }
        return
      }

      if (node.matches?.('a[href]') && href && href !== '#' && !href.startsWith('#')) {
        window.location.assign(href)
        return
      }

      if (!action) return
    }

    const currentPage = pageDataRef.current
    const fromPage = currentPage?.pageType

    if (String(fromPage || '').toUpperCase() === 'THANKYOU') {
      const dest = String(
        currentPage?.successRedirect || currentPage?.successRedirectUrl || '',
      ).trim()
      if (dest && isExternalHttpRedirect(dest)) {
        window.location.assign(dest)
        return
      }
    }

    if (action === 'SUBSCRIBE_ROUTE') {
      transitionLockRef.current = true
      setTransitioning(true)
      setError('')
      try {
        await executeShadowSubscribeRoute({
          node,
          shadow,
          country,
          operator,
          fromPage,
          visitIdRef,
          phoneRef,
          campid,
          campidRef,
          trackingCampid,
          trackingCampidRef,
          selectedPackRef,
          clickIdRef,
          rcidRef,
          vidRef,
          affIdRef,
          loadPage,
          cachePage,
          setError,
        })
      } finally {
        setTransitioning(false)
        transitionLockRef.current = false
      }
      return
    }

    if (fromPage === 'OTP') {
      return
    }
    if (action !== 'SUBSCRIBE' && action !== 'CONFIRM') {
      return
    }

    transitionLockRef.current = true
    setTransitioning(true)
    setError('')
    try {
      await executeShadowTransition({
        node,
        shadow,
        action,
        fromPage,
        country,
        operator,
        visitIdRef,
        phoneRef,
        campid,
        campidRef,
        trackingCampid,
        trackingCampidRef,
        selectedPackRef,
        clickIdRef,
        rcidRef,
        vidRef,
        affIdRef,
        setPhone,
        saveSession,
        cachePage,
        setError,
      })
    } finally {
      setTransitioning(false)
      transitionLockRef.current = false
    }
  }
}
