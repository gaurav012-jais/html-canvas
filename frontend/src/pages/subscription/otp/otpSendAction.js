import { sendOtp } from '../../../services/api/otp'
import {
  formatMsisdnWithCountryCode,
  normalizeMsisdn,
  persistPhone,
  resolvePhoneFromStorage,
} from '../../../services/flow/resolvePhoneNumber'
import { trackEvent } from '../../../utils/tracking'
import { getCountryCodeFromDom } from './otpDomHelpers'
import { recordResendAttempt } from './otpSession'

export function createOtpSendHandler({
  shadow,
  phoneInput,
  otpInput,
  sendBtn,
  inlineResendBtn,
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
  setTransitioning,
  pageCacheRef,
  transitionLockRef,
  transitionFlow,
  cachePage,
  loadPage,
  setStep,
  countdown,
  updateSlot,
  getResendAttempts,
  incrementResendAttempts,
}) {
  let isSending = false

  return async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (isSending) return

    const attempts = getResendAttempts()
    if (attempts >= 5) {
      updateSlot(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
      return
    }

    const basePhone =
      (phoneInput ? phoneInput.value.trim() : '') ||
      phoneRef?.current ||
      resolvePhoneFromStorage() ||
      ''
    const cleanBasePhone = basePhone.replace(/\D/g, '')

    if (!cleanBasePhone) {
      updateSlot(errorSlot, 'Please enter a valid mobile number', true)
      return
    }

    const minAttr =
      phoneInput?.getAttribute('minlength') || phoneInput?.getAttribute('data-min-length')
    const min = minAttr != null && minAttr !== '' ? parseInt(minAttr, 10) : NaN
    const maxAttr =
      phoneInput?.getAttribute('maxlength') || phoneInput?.getAttribute('data-max-length')
    const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN

    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const cleanCountryDigits = normalizeMsisdn(activeCountryCode)
    const alreadyHasCountryCode = Boolean(
      cleanCountryDigits && cleanBasePhone.startsWith(cleanCountryDigits),
    )
    const effectiveMin =
      alreadyHasCountryCode && Number.isFinite(min) ? min + cleanCountryDigits.length : min
    const effectiveMax =
      alreadyHasCountryCode && Number.isFinite(max) ? max + cleanCountryDigits.length : max

    if (Number.isFinite(effectiveMin) && effectiveMin > 0 && cleanBasePhone.length < effectiveMin) {
      updateSlot(errorSlot, `Mobile number must be at least ${min} digits`, true)
      return
    }
    if (Number.isFinite(effectiveMax) && effectiveMax > 0 && cleanBasePhone.length > effectiveMax) {
      updateSlot(errorSlot, `Mobile number cannot exceed ${max} digits`, true)
      return
    }

    const msisdn = formatMsisdnWithCountryCode(cleanBasePhone, activeCountryCode)
    updateSlot(errorSlot, '')
    updateSlot(statusSlot, 'Sending verification code...')

    if (sendBtn) {
      sendBtn.disabled = true
      sendBtn.style.opacity = '0.5'
      sendBtn.innerHTML = `Sending... <span class="otp-spinner"></span>`
    }

    isSending = true
    try {
      const data = await sendOtp({
        phone: msisdn,
        visitId: visitIdRef.current,
        pack: packRef?.current,
      })
      phoneRef.current = msisdn
      setPhone(msisdn)
      persistPhone(msisdn)
      pageCacheRef?.current?.delete('CONFIRM')
      pageCacheRef?.current?.delete('THANKYOU')
      trackEvent('otp_sent')

      if (data?.isSubscribed || data?.status === 'ACTIVE') {
        if (data.forwardUrl) {
          updateSlot(statusSlot, 'Abonnement déjà actif ! Redirection en cours...')
          setTimeout(() => {
            window.location.href = data.forwardUrl
          }, 800)
          return
        }
      }

      if (!otpInput) {
        updateSlot(statusSlot, 'Code envoyé ! Chargement...')
        setTransitioning(true)
        if (transitionLockRef) transitionLockRef.current = true
        try {
          const next = await transitionFlow({
            visitId: visitIdRef.current,
            country,
            operator,
            campid: campid || undefined,
            trackingCampid: trackingCampid || undefined,
            fromPage: 'CONFIRM',
            action: 'OTP_SENT',
            phone: msisdn,
          })
          if (next) cachePage(next)
          if (loadPage && (!next || String(next.pageType).toUpperCase() === 'CONFIRM')) {
            await loadPage('OTP', { direct: true })
          }
        } catch {
          if (loadPage) await loadPage('OTP', { direct: true })
        } finally {
          setTransitioning(false)
          if (transitionLockRef) transitionLockRef.current = false
        }
        return
      }

      otpInput.value = ''
      let successText = 'Verification code sent!'
      const devOtp = data.devOtpCode || data.otp
      if (devOtp) {
        successText += ` (Dev OTP: ${devOtp})`
      }
      updateSlot(statusSlot, successText)
      setStep(2)

      const updatedAttempts = incrementResendAttempts()
      recordResendAttempt(country, operator, msisdn, updatedAttempts)

      if (updatedAttempts >= 5) {
        if (sendBtn) {
          sendBtn.disabled = true
          sendBtn.style.opacity = '0.5'
          sendBtn.textContent = 'Limit Exceeded'
        }
        if (inlineResendBtn) {
          inlineResendBtn.disabled = true
          inlineResendBtn.textContent = 'Limit Exceeded'
        }
        updateSlot(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
        return
      }

      countdown.start(30, () => {
        if (getResendAttempts() < 5 && sendBtn) {
          sendBtn.style.opacity = '1'
          sendBtn.textContent = 'Get OTP'
        }
        updateSlot(statusSlot, '')
      })
    } catch (err) {
      updateSlot(statusSlot, '')
      updateSlot(errorSlot, err.message, true)
      if (getResendAttempts() < 5) {
        countdown.updateDisplay('Resend code', false)
        if (sendBtn) {
          sendBtn.disabled = false
          sendBtn.style.opacity = '1'
          sendBtn.textContent = 'Get OTP'
        }
      }
    } finally {
      isSending = false
    }
  }
}
