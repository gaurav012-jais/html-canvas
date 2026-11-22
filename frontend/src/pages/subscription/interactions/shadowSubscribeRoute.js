import { transitionFlow } from '../../../services/api/flow'
import { trackEvent } from '../../../utils/tracking'
import { parseSubscribeRoutes, resolveSubscribeDestination } from '../../../editor/utils/subscribeRoutes'
import { VALID_PAGES } from '../constants'
import { normalizePack, packSubscribeExtras } from '../flowHelpers'
import { getSelectedPackFromShadow } from '../shadowDom'
import { resolvePhoneFromStorage } from '../../../services/flow/resolvePhoneNumber'

export async function executeShadowSubscribeRoute({
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
}) {
  const planId =
    (node.hasAttribute('data-pack') ? normalizePack(node.getAttribute('data-pack')) : '') ||
    getSelectedPackFromShadow(shadow) ||
    selectedPackRef.current ||
    'daily'
  const routes = parseSubscribeRoutes({
    'data-subscribe-routes': node.getAttribute('data-subscribe-routes'),
  })

  try {
    const next = await transitionFlow({
      visitId: visitIdRef.current,
      country,
      operator,
      campid: campid || campidRef.current || undefined,
      trackingCampid: trackingCampid || trackingCampidRef.current || undefined,
      fromPage: fromPage || 'HOME',
      action: 'SUBSCRIBE_ROUTE',
      phone: phoneRef.current || resolvePhoneFromStorage() || undefined,
      planId,
      clickId: clickIdRef.current || undefined,
      rcid: rcidRef.current || undefined,
      vid: vidRef.current || undefined,
      affId: affIdRef.current || undefined,
      subscribeRoutes: routes,
      ...packSubscribeExtras(node),
    })

    if (next.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
      window.location.assign(next.externalRedirect)
      return
    }

    const dest = resolveSubscribeDestination(routes, next)

    if (dest?.go === 'external') {
      const url = String(dest.url || '').trim()
      if (url && /^https?:\/\//i.test(url)) {
        window.location.assign(url)
        return
      }
    }

    const targetPage = String(dest?.page || next.pageType || 'THANKYOU')
      .trim()
      .toUpperCase()
    if (VALID_PAGES.includes(targetPage)) {
      if (
        next.routeOutcome === 'SUCCESS' ||
        next.routeOutcome === 'RULE_MATCH' ||
        next.routeOutcome === 'ALREADY_SUBSCRIBED'
      ) {
        trackEvent('confirm_completed')
      }
      await loadPage(targetPage, { direct: true })
      return
    }

    cachePage(next)
  } catch (err) {
    setError(err.message || 'Subscribe failed')
  }
}
