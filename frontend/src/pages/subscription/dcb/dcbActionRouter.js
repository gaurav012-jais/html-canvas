import { checkDcbMsisdn, confirmDcbPincode, getDcbConfig, sendDcbPincode } from '../../../services/api/dcb'
import { sendOtp, verifyOtp } from '../../../services/api/otp'
import { formatMsisdnWithCountryCode, persistPhone } from '../../../services/flow/resolvePhoneNumber'
import { getCountryCodeFromDom } from '../setupOtpBindings'
import { resolvePurchaseType, routeDcbResponse } from './dcbDomHelpers'

function validateInputLength(val, input, label, unitLabel, setSlot, errorSlot) {
  const minAttr = input?.getAttribute('minlength') || input?.getAttribute('data-min-length')
  const min = minAttr != null && minAttr !== '' ? parseInt(minAttr, 10) : NaN
  if (Number.isFinite(min) && min > 0 && val.length < min) {
    setSlot(errorSlot, `${label} must be at least ${min} ${unitLabel}`, true)
    return false
  }
  const maxAttr = input?.getAttribute('maxlength') || input?.getAttribute('data-max-length')
  const max = maxAttr != null && maxAttr !== '' ? parseInt(maxAttr, 10) : NaN
  if (Number.isFinite(max) && max > 0 && val.length > max) {
    setSlot(errorSlot, `${label} cannot exceed ${max} ${unitLabel}`, true)
    return false
  }
  return true
}

export function createDcbActionHandlers({
  shadow,
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
  saveSession,
  phoneInput,
  pinInput,
  errorSlot,
  statusSlot,
  setSlot,
  run,
  getCurrentStage,
  setCurrentStage,
  adaptDcbStageUi,
}) {
  const context = pageData.flowContext || {}

  const commonPayload = (phone) => ({
    visitId: visitIdRef.current,
    phone: phone || phoneRef.current || undefined,
    msisdn: phone || phoneRef.current || undefined,
    country,
    operator,
    campid: campid || undefined,
    trackingCampid: trackingCampid || undefined,
  })

  const savedDcbSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(`tc_session_${country}_${operator}`) || '{}')
    } catch {
      return {}
    }
  }

  const handleManualCheck = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const rawVal = String(phoneInput?.value || phoneRef.current || '').replace(/\D/g, '')
    const phone = formatMsisdnWithCountryCode(rawVal, activeCountryCode)
    if (!phone) {
      setSlot(errorSlot, 'Please enter a valid mobile number', true)
      return
    }
    run(async () => {
      const response = await checkDcbMsisdn(commonPayload(phone))
      phoneRef.current = phone
      setPhone(phone)
      persistPhone(phone)
      const responseStage = String(response?.stage || response?.flowContext?.stage || '').toUpperCase()
      const authOtp = responseStage === 'AUTH_OTP' || response?.authorization === 'PARTNER_OTP'
      const pinReady = responseStage === 'PIN_REQUIRED'
      saveSession({
        phone,
        msisdnSource: 'MANUAL',
        transactionChannel: 'Wifi',
        dcbStage: authOtp ? 'AUTH_OTP' : pinReady ? 'PIN_REQUIRED' : 'PLAN_SELECT',
        ...(response?.purchaseTypeId ? { purchaseTypeId: response.purchaseTypeId } : {}),
      })
      if (authOtp) {
        setCurrentStage('AUTH_OTP')
        adaptDcbStageUi(shadow, 'AUTH_OTP', { phoneInput, pinInput })
        await sendOtp({ phone, visitId: visitIdRef.current })
        setSlot(statusSlot, 'OTP sent. Check the server log or enter 1234.')
        if (String(pageData.pageType || '').toUpperCase() !== 'OTP') {
          await loadPage('OTP', { direct: true })
        }
        return
      }
      if (pinReady) {
        setCurrentStage('PIN_REQUIRED')
        setSlot(statusSlot, 'PIN sent')
        await loadPage('OTP', { direct: true })
        return
      }
      setSlot(statusSlot, 'Number checked')
      const target = await routeDcbResponse(response, {
        currentPage: pageData.pageType,
        cachePage,
        loadPage,
      })
      if (!target || target === 'OTP') {
        await loadPage('HOME', { direct: true })
      }
    }, 'Checking subscription...')
  }

  const handlePlanClick = (event, node) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const packKey = node.getAttribute('data-pack') || node.getAttribute('data-plan') || selectedPackRef.current || ''
    const directId = node.getAttribute('data-purchase-type-id')
    run(async () => {
      let purchaseTypeId = resolvePurchaseType(context, packKey, directId) || String(context.purchaseTypeId || '')
      if (!purchaseTypeId) {
        const config = await getDcbConfig(commonPayload())
        purchaseTypeId = resolvePurchaseType(config, packKey, directId)
      }
      if (!purchaseTypeId) {
        throw new Error('This plan is not mapped to a Universe purchase type.')
      }
      const saved = savedDcbSession()
      const msisdnSource = context.msisdnSource || saved.msisdnSource
      const transactionChannel =
        context.transactionChannel ||
        saved.transactionChannel ||
        (String(msisdnSource || '').toUpperCase() === 'HE' ? 'HE' : 'Wifi')
      selectedPackRef.current = packKey || selectedPackRef.current
      saveSession({
        purchaseTypeId,
        transactionChannel,
        msisdnSource: msisdnSource || undefined,
        dcbStage: 'PIN_REQUIRED',
      })
      const response = await sendDcbPincode({
        ...commonPayload(),
        purchaseTypeId,
        transactionChannel,
      })
      setSlot(statusSlot, 'PIN sent')
      const target = await routeDcbResponse(response, {
        currentPage: pageData.pageType,
        cachePage,
        loadPage,
      })
      if (!target || target === 'HOME') {
        await loadPage('OTP', { direct: true })
      }
    }, 'Sending PIN...')
  }

  const handleConfirm = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const pin = String(pinInput?.value || '').trim()
    if (!pin) {
      setSlot(errorSlot, 'Please enter the PIN', true)
      return
    }
    if (!validateInputLength(pin, pinInput, 'PIN', 'characters', setSlot, errorSlot)) {
      return
    }
    run(async () => {
      const response = await confirmDcbPincode({
        ...commonPayload(),
        pin,
      })
      setSlot(statusSlot, 'PIN confirmed. Activating subscription...')
      await routeDcbResponse(response, {
        currentPage: pageData.pageType,
        cachePage,
        loadPage,
      })
    }, 'Confirming PIN...')
  }

  const handleAuthSend = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const rawVal = String(phoneRef.current || phoneInput?.value || '').replace(/\D/g, '')
    const phone = formatMsisdnWithCountryCode(rawVal, activeCountryCode)
    if (!phone) {
      setSlot(errorSlot, 'Please enter a valid mobile number', true)
      return
    }
    if (!validateInputLength(rawVal, phoneInput, 'Mobile number', 'digits', setSlot, errorSlot)) {
      return
    }
    run(async () => {
      await sendOtp({ phone, visitId: visitIdRef.current })
      setSlot(statusSlot, 'OTP sent. Check the server log or enter 1234.')
    }, 'Sending OTP...')
  }

  const handleAuthVerify = (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const activeCountryCode = getCountryCodeFromDom(phoneInput, shadow)
    const rawVal = String(phoneRef.current || phoneInput?.value || '').replace(/\D/g, '')
    const phone = formatMsisdnWithCountryCode(rawVal, activeCountryCode)
    const otp = String(pinInput?.value || '').trim()
    if (!otp) {
      setSlot(errorSlot, 'Please enter the OTP', true)
      return
    }
    if (!validateInputLength(otp, pinInput, 'OTP', 'characters', setSlot, errorSlot)) {
      return
    }
    run(async () => {
      await verifyOtp({ phone, otp, visitId: visitIdRef.current })
      saveSession({ dcbStage: undefined })
      setSlot(statusSlot, 'OTP verified')
      await loadPage('THANKYOU', { direct: true })
    }, 'Verifying OTP...')
  }

  const handleClick = (event) => {
    const path = event.composedPath?.() || []
    const node = path.find(
      (item) =>
        item instanceof HTMLElement &&
        item.matches('[data-dcb-action], [data-otp-action], [data-action], [data-purchase-type-id]'),
    )
    if (!node) return
    const action = String(
      node.getAttribute('data-dcb-action') ||
        node.getAttribute('data-otp-action') ||
        node.getAttribute('data-action') ||
        '',
    ).toUpperCase()

    const currentStage = getCurrentStage()

    if (['MANUAL_MSISDN', 'MANUAL_CHECK', 'MANUAL_ENTRY', 'MSISDN_REQUIRED'].includes(currentStage)) {
      if (['MANUAL-CHECK', 'MANUAL_CHECK', 'SEND'].includes(action)) {
        handleManualCheck(event)
      }
      return
    }
    if (['PLAN_SELECT', 'SELECT_PLAN', 'PLAN_REQUIRED', 'PURCHASE_TYPE_SELECTION'].includes(currentStage)) {
      if (
        node.hasAttribute('data-purchase-type-id') ||
        ['SEND-PIN', 'SEND_PIN', 'SUBSCRIBE', 'CONFIRM'].includes(action)
      ) {
        handlePlanClick(event, node)
      }
      return
    }
    if (['BILLING_PIN', 'PIN_ENTRY', 'PIN_SENT', 'PIN_REQUIRED'].includes(currentStage)) {
      if (['CONFIRM-PIN', 'CONFIRM_PIN', 'VERIFY', 'VERIFY-OTP'].includes(action)) {
        handleConfirm(event)
      }
      return
    }
    if (['AUTH_OTP', 'AUTHORIZATION_REQUIRED'].includes(currentStage)) {
      if (['MANUAL-CHECK', 'MANUAL_CHECK', 'SEND', 'SEND-PIN', 'SEND_PIN'].includes(action)) {
        handleAuthSend(event)
      }
      if (['CONFIRM-PIN', 'CONFIRM_PIN', 'VERIFY', 'VERIFY-OTP'].includes(action)) {
        handleAuthVerify(event)
      }
    }
  }

  return { handleClick }
}
