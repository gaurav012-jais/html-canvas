import { transitionFlow } from '../../../services/api/flow'
import { trackEvent } from '../../../utils/tracking'
import { normalizePack, packSubscribeExtras } from '../flowHelpers'
import { getSelectedPackFromShadow } from '../shadowDom'
import { capturePhoneFromShadow } from '../setupOtpBindings'
import { persistPhone, resolvePhoneFromStorage } from '../../../services/flow/resolvePhoneNumber'

export async function executeShadowTransition({
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
}) {
  const phoneInput = shadow.querySelector(
    '[data-otp-field="phone"], [data-field="phone"], input[type="tel"]',
  )
  if (phoneInput && phoneInput.value.trim()) {
    const fullMsisdn = capturePhoneFromShadow(shadow, phoneInput)
    if (fullMsisdn) {
      phoneRef.current = fullMsisdn
      if (setPhone) setPhone(fullMsisdn)
      persistPhone(fullMsisdn)
      if (saveSession) saveSession({ phone: fullMsisdn })
    }
  }

  const packOnButton = node.hasAttribute('data-pack')
    ? normalizePack(node.getAttribute('data-pack'))
    : ''
  const planId =
    packOnButton ||
    (fromPage === 'CONFIRM' ? getSelectedPackFromShadow(shadow) : undefined)

  try {
    const next = await transitionFlow({
      visitId: visitIdRef.current,
      country,
      operator,
      campid: campid || campidRef.current || undefined,
      trackingCampid: trackingCampid || trackingCampidRef.current || undefined,
      fromPage,
      action,
      phone: phoneRef.current || resolvePhoneFromStorage() || undefined,
      clickId: clickIdRef.current || undefined,
      rcid: rcidRef.current || undefined,
      vid: vidRef.current || undefined,
      affId: affIdRef.current || undefined,
      ...(planId ? { planId } : {}),
      ...packSubscribeExtras(node),
    })

    if (next.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
      window.location.assign(next.externalRedirect)
      return
    }

    cachePage(next)
    if (next.pageType === 'CONFIRM') {
      selectedPackRef.current = 'daily'
    }
    if (fromPage === 'CONFIRM' && action === 'CONFIRM' && next.pageType === 'THANKYOU') {
      trackEvent('confirm_completed')
    }
  } catch (err) {
    setError(err.message || 'Action failed')
  }
}
