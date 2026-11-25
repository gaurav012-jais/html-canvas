import { verifyOtp } from '../../../services/api/otp'
import {
  formatMsisdnWithCountryCode,
  persistPhone,
  resolvePhoneFromStorage,
} from '../../../services/flow/resolvePhoneNumber'
import { trackEvent } from '../../../utils/tracking'
import { getCountryCodeFromDom } from './otpDomHelpers'

export function createOtpVerifyHandler({
  shadow,
  phoneInput,
  otpInput,
  verifyBtn,
  errorSlot,
  statusSlot,
  country,
  operator,
  campid,
  trackingCampid,
  visitIdRef,
  phoneRef,
  packRef,
  setPhone,
  pageCacheRef,
  setTransitioning,
  transitionLockRef,
  transitionFlow,
  cachePage,
  loadPage,
  updateSlot,
}) {
  let isVerifying = false

  return async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (isVerifying) return

    const basePhone =
      (phoneInput ? phoneInput.value.trim() : '') ||
      phoneRef?.current ||
      resolvePhoneFromStorage() ||
      ''
    const cleanBasePhone = basePhone.replace(/\D/g, '')
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const msisdn =
      formatMsisdnWithCountryCode(cleanBasePhone, activeCountryCode) ||
      phoneRef?.current ||
      resolvePhoneFromStorage() ||
      ''
    const code = otpInput ? otpInput.value.trim() : ''

    if (!msisdn) {
      updateSlot(errorSlot, 'Mobile number is missing', true)
      return
    }
    if (!code) {
      updateSlot(errorSlot, 'Please enter the verification code', true)
      return
    }

    const minAttr =
      otpInput?.getAttribute('minlength') || otpInput?.getAttribute('data-min-length')
    const min = minAttr != null && minAttr !== '' ? parseInt(minAttr, 10) : NaN
    if (Number.isFinite(min) && min > 0 && code.length < min) {
      updateSlot(errorSlot, `Code must be at least ${min} characters`, true)
      return
    }

    const maxAttr =
      otpInput?.getAttribute('maxlength') || otpInput?.getAttribute('data-max-length')
    const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN
    if (Number.isFinite(max) && max > 0 && code.length > max) {
      updateSlot(errorSlot, `Code cannot exceed ${max} characters`, true)
      return
    }

    const origVerifyHtml = verifyBtn ? verifyBtn.innerHTML : 'Verify & Continue'
    const originalStatusText = statusSlot ? statusSlot.textContent : ''

    updateSlot(errorSlot, '')
    updateSlot(statusSlot, 'Verifying code...')

    if (verifyBtn) {
      verifyBtn.disabled = true
      verifyBtn.style.opacity = '0.5'
      verifyBtn.innerHTML = `Verifying... <span class="otp-spinner"></span>`
    }

    isVerifying = true
    try {
      await verifyOtp({
        phone: msisdn,
        otp: code,
        visitId: visitIdRef.current,
        pack: packRef?.current,
      })

      trackEvent('otp_verified')
      if (phoneRef) phoneRef.current = msisdn
      if (setPhone) setPhone(msisdn)
      persistPhone(msisdn)
      pageCacheRef?.current?.delete('CONFIRM')
      pageCacheRef?.current?.delete('THANKYOU')

      updateSlot(statusSlot, 'Verified! Continuing...')
      setTransitioning(true)
      if (transitionLockRef) transitionLockRef.current = true

      try {
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          campid: campid || undefined,
          trackingCampid: trackingCampid || undefined,
          fromPage: 'OTP',
          action: 'CONTINUE',
          phone: msisdn,
        })

        if (next?.externalRedirect && /^https?:\/\//i.test(next.externalRedirect)) {
          window.location.assign(next.externalRedirect)
          return
        }
        if (next) cachePage(next)
        const nextType = String(next?.pageType || '').toUpperCase()
        if (nextType === 'OTP' && loadPage) {
          await loadPage('HOME', { direct: true })
        }
      } catch (err) {
        updateSlot(errorSlot, err.message || 'Funnel transition failed', true)
        if (statusSlot) statusSlot.textContent = originalStatusText
        if (verifyBtn) {
          verifyBtn.disabled = false
          verifyBtn.style.opacity = '1'
          verifyBtn.innerHTML = origVerifyHtml
        }
      } finally {
        setTransitioning(false)
        if (transitionLockRef) transitionLockRef.current = false
      }
    } catch (err) {
      trackEvent('otp_failed')
      if (statusSlot) statusSlot.textContent = originalStatusText
      updateSlot(errorSlot, err.message, true)
      if (verifyBtn) {
        verifyBtn.disabled = false
        verifyBtn.style.opacity = '1'
        verifyBtn.innerHTML = origVerifyHtml
      }
    } finally {
      isVerifying = false
    }
  }
}
