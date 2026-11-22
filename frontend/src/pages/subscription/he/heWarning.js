import {
  appendHeAttributionToUrl,
  isHeRedirectUrl,
  pickHeFailRedirectUrl,
} from '../../../services/flow/resolvePhoneNumber'
import {
  isApiHeProvider,
  normalizeDetectNextPage,
  shouldTreatCgAsHeFailRedirect,
} from '../flowHelpers'

export function evaluateHeWarning({
  meta,
  phoneResolving,
  phone,
  clickId,
  rcid,
  campid,
  trackingCampid,
  setSearchParams,
  loadPageRef,
  setError,
}) {
  const isApiHe = isApiHeProvider(meta.heProvider)

  if (phoneResolving || !meta.done) {
    console.log('[subscription] Detecting mobile number… please wait a moment and try again.')
    return true
  }

  if (!shouldTreatCgAsHeFailRedirect(meta.verificationMode)) return false
  if (!isApiHe) return false

  const nextPage = normalizeDetectNextPage(meta.nextPage)
  if (phone && nextPage) {
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        nextParams.set('step', nextPage)
        return nextParams
      },
      { replace: true },
    )
    loadPageRef.current?.(nextPage, { direct: true })
    return true
  }

  if (phone && isHeRedirectUrl(meta.successRedirectUrl)) {
    const dest = appendHeAttributionToUrl(meta.successRedirectUrl, {
      clickId,
      rcid,
      msisdn: phone,
      campid,
      trackingCampid,
    })
    if (dest) {
      window.location.assign(dest)
      return true
    }
  }

  if (phone) return false

  const baseFailUrl = pickHeFailRedirectUrl({
    failRedirectUrl: meta.failRedirectUrl,
    cgRedirectUrl: shouldTreatCgAsHeFailRedirect(meta.verificationMode)
      ? meta.cgRedirectUrl
      : '',
  })
  const failUrl = baseFailUrl
    ? appendHeAttributionToUrl(baseFailUrl, {
        clickId,
        rcid,
        msisdn: phone,
        campid,
        trackingCampid,
      })
    : ''

  if (!failUrl) return false

  const message =
    meta.heError ||
    'Could not detect your mobile number. Please use operator mobile data.'
  setError(message)
  console.warn('[HE] CTA blocked — no MSISDN', { message, failUrl })
  window.setTimeout(() => {
    window.location.assign(failUrl)
  }, 2000)
  return true
}
