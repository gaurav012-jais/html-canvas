import {
  formatMsisdnWithCountryCode,
  normalizeMsisdn,
  persistPhone,
  resolvePhoneFromStorage,
} from '../../services/flow/resolvePhoneNumber'
import {
  getCountryCodeFromDom,
  capturePhoneFromShadow,
  setErrorText,
  setStatusText,
  setSlotText,
  findContainer,
} from './otp/otpDomHelpers'
import { ensureStep2Footer, toggleOtpStep } from './otp/otpStepUi'
import { createOtpCountdown } from './otp/otpCountdown'
import { getResendAttempts, recordResendAttempt } from './otp/otpSession'
import { createOtpSendHandler } from './otp/otpSendAction'
import { createOtpVerifyHandler } from './otp/otpVerifyAction'

export { getCountryCodeFromDom, capturePhoneFromShadow }

export function setupOtpBindings(
  shadow,
  {
    transitionFlow,
    cachePage,
    loadPage,
    country,
    operator,
    campid,
    trackingCampid,
    visitIdRef,
    phoneRef,
    packRef,
    setPhone,
    setTransitioning,
    setError,
    pageCacheRef,
    transitionLockRef,
  },
) {
  const sendBtn = shadow.querySelector('[data-action="send-otp"], [data-otp-action="send"]')
  const verifyBtn = shadow.querySelector('[data-action="verify-otp"], [data-otp-action="verify"]')
  const phoneInput = shadow.querySelector('[data-otp-field="phone"], [data-field="phone"], input[type="tel"]')
  const otpInput = shadow.querySelector('[data-otp-field="otp"], [data-field="otp"]')
  const errorSlot = shadow.querySelector('[data-otp-slot="error"], [data-slot="error"]')
  const statusSlot = shadow.querySelector('[data-otp-slot="status"], [data-slot="status"]')

  const updateSlot = (slot, text, isErr = false) =>
    setSlotText(shadow, verifyBtn, setError, statusSlot, slot, text, isErr)

  let resendAttempts = getResendAttempts(country, operator)
  const countryCode = getCountryCodeFromDom(phoneInput, shadow)

  if (phoneInput) {
    const initialPhone = phoneRef?.current || resolvePhoneFromStorage() || ''
    if (initialPhone) {
      if (phoneRef) phoneRef.current = initialPhone
      if (setPhone) setPhone(initialPhone)
      const cleanCode = normalizeMsisdn(countryCode)
      const hasVisibleBadge = Boolean(
        shadow.querySelector(
          '[data-country-code], .wjo-country-code, .country-code-prefix, .phone-prefix-badge, .bf-country-prefix',
        ),
      )
      if (
        hasVisibleBadge &&
        cleanCode &&
        initialPhone.startsWith(cleanCode) &&
        initialPhone.length > cleanCode.length + 4
      ) {
        phoneInput.value = initialPhone.slice(cleanCode.length)
      } else {
        phoneInput.value = initialPhone
      }
    }
  }

  const handlePhoneInput = (e) => {
    updateSlot(errorSlot, '')
    let val = e.target.value.trim().replace(/\D/g, '')
    const maxAttr = phoneInput?.getAttribute('maxlength') || phoneInput?.getAttribute('data-max-length')
    const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN
    if (Number.isFinite(max) && max > 0 && val.length > max) {
      val = val.slice(0, max)
    }
    if (e.target.value !== val) {
      e.target.value = val
    }
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const fullMsisdn = formatMsisdnWithCountryCode(val, activeCountryCode)
    if (phoneRef) phoneRef.current = fullMsisdn
    if (setPhone) setPhone(fullMsisdn)
    if (fullMsisdn) persistPhone(fullMsisdn)
  }

  if (resendAttempts >= 5) {
    if (sendBtn) {
      sendBtn.disabled = true
      sendBtn.style.opacity = '0.5'
      sendBtn.textContent = 'Limit Exceeded'
    }
    updateSlot(errorSlot, 'Maximum resend attempts reached. Please try again later.', true)
  }

  const isTwoStepOtp = Boolean(phoneInput && otpInput && sendBtn && verifyBtn)
  const phoneBlock = findContainer(phoneInput, '[data-otp-field="otp"], [data-field="otp"]')
  const otpBlock = findContainer(otpInput, '[data-otp-field="phone"], [data-field="phone"]')
  const existingResendRow = shadow.querySelector('.otp-resend-row')
  let changeNumberBtn = shadow.querySelector('[data-otp-action="change-phone"]')

  const { step2Footer, changeNumberBtn: updatedChangeBtn } = ensureStep2Footer(
    isTwoStepOtp,
    changeNumberBtn,
    verifyBtn,
    (e) => handleSendClick(e),
  )
  if (updatedChangeBtn) changeNumberBtn = updatedChangeBtn

  const inlineResendBtn = step2Footer?.querySelector?.('.otp-resend-link') || null
  const countdown = createOtpCountdown(sendBtn, inlineResendBtn)

  const setStep = (step) =>
    toggleOtpStep({
      step,
      isTwoStepOtp,
      phoneBlock,
      sendBtn,
      otpBlock,
      verifyBtn,
      step2Footer,
      existingResendRow,
      otpInput,
    })

  const handleChangePhone = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    countdown.stop()
    setStep(1)
    updateSlot(errorSlot, '')
    updateSlot(statusSlot, '')
    if (sendBtn && resendAttempts < 5) {
      sendBtn.disabled = false
      sendBtn.style.opacity = '1'
      sendBtn.textContent = 'Get OTP'
    }
    if (phoneInput) {
      const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
      const cleanCode = normalizeMsisdn(activeCountryCode)
      const hasVisibleBadge = Boolean(
        shadow.querySelector(
          '[data-country-code], .wjo-country-code, .country-code-prefix, .phone-prefix-badge, .bf-country-prefix',
        ),
      )
      if (
        hasVisibleBadge &&
        cleanCode &&
        phoneRef?.current?.startsWith(cleanCode) &&
        phoneRef.current.length > cleanCode.length + 4
      ) {
        phoneInput.value = phoneRef.current.slice(cleanCode.length)
      } else if (phoneRef?.current) {
        phoneInput.value = phoneRef.current
      }
      phoneInput.focus?.()
    }
  }

  if (changeNumberBtn) {
    changeNumberBtn.addEventListener('click', handleChangePhone)
  }

  if (isTwoStepOtp) {
    setStep(resendAttempts > 0 ? 2 : 1)
  }

  const handleSendClick = createOtpSendHandler({
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
    getResendAttempts: () => resendAttempts,
    incrementResendAttempts: () => {
      resendAttempts += 1
      return resendAttempts
    },
  })

  const handleVerifyClick = createOtpVerifyHandler({
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
    setTransitioning,
    transitionLockRef,
    transitionFlow,
    cachePage,
    loadPage,
    updateSlot,
  })

  if (phoneInput) {
    phoneInput.addEventListener('input', handlePhoneInput)
  }
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendClick)
  }
  if (verifyBtn) {
    verifyBtn.addEventListener('click', handleVerifyClick)
  }

  return () => {
    countdown.stop()
    if (phoneInput) phoneInput.removeEventListener('input', handlePhoneInput)
    if (sendBtn) sendBtn.removeEventListener('click', handleSendClick)
    if (verifyBtn) verifyBtn.removeEventListener('click', handleVerifyClick)
    if (changeNumberBtn) changeNumberBtn.removeEventListener('click', handleChangePhone)
  }
}
