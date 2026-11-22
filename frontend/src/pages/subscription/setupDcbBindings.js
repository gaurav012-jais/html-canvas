import { applyDcbStageUi } from '../../services/flow/dcbStageUi'
import {
  DCB_STAGES,
  normalizeDcbStage,
  isDcbFlowContext,
  normalizedOutcome,
  pageForDcbOutcome,
  routeDcbResponse,
  purchaseTypesFrom,
  resolvePurchaseType,
} from './dcb/dcbDomHelpers'
import { createDcbActionHandlers } from './dcb/dcbActionRouter'

function adaptDcbStageUi(shadow, stage, { phoneInput, pinInput }) {
  applyDcbStageUi(shadow, stage, { phoneInput, pinInput })
}

function setupDcbBindings(
  shadow,
  {
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
  },
) {
  if (!isDcbFlowContext(pageData)) return null

  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(`tc_session_${country}_${operator}`) || '{}')
    } catch {
      return {}
    }
  })()

  let currentStage =
    saved.dcbStage && String(pageData.pageType || '').toUpperCase() === 'OTP'
      ? saved.dcbStage
      : normalizeDcbStage(pageData)

  const phoneInput = shadow.querySelector(
    '[data-dcb-field="phone"], [data-otp-field="phone"], [data-field="phone"], input[type="tel"]',
  )
  const pinInput = shadow.querySelector(
    '[data-dcb-field="pin"], [data-otp-field="otp"], [data-field="otp"], [data-field="pin"]',
  )
  const errorSlot = shadow.querySelector('[data-dcb-slot="error"], [data-otp-slot="error"], [data-slot="error"]')
  const statusSlot = shadow.querySelector('[data-dcb-slot="status"], [data-otp-slot="status"], [data-slot="status"]')
  let busy = false

  adaptDcbStageUi(shadow, currentStage, { phoneInput, pinInput })
  if (phoneInput && phoneRef.current) phoneInput.value = phoneRef.current

  const isErrorSlot = (el) => {
    if (!el) return false
    return (
      el.matches?.(
        '[data-dcb-slot="error"], [data-otp-slot="error"], [data-slot="error"], .dcb-error-slot, .bf-error-slot, .wjo-error',
      ) ||
      el.getAttribute?.('data-dcb-slot') === 'error' ||
      el.getAttribute?.('data-otp-slot') === 'error' ||
      el.getAttribute?.('data-slot') === 'error'
    )
  }

  const setSlot = (slot, text, error = false) => {
    const isErr = error || isErrorSlot(slot)
    const selector = isErr
      ? '[data-dcb-slot="error"], [data-otp-slot="error"], [data-slot="error"], .dcb-error-slot, .bf-error-slot, .wjo-error'
      : '[data-dcb-slot="status"], [data-otp-slot="status"], [data-slot="status"], .dcb-status-slot, .bf-status-slot, .wjo-status'
    const slots = shadow.querySelectorAll(selector)
    if (slots.length > 0) {
      slots.forEach((s) => {
        s.textContent = text || ''
        s.style.color = isErr ? '#dc2626' : '#4b5563'
        if (text) {
          s.hidden = false
          if (s.style.display === 'none') s.style.display = ''
        }
      })
    } else if (slot) {
      slot.textContent = text || ''
      slot.style.color = isErr ? '#dc2626' : '#4b5563'
    }
  }

  const run = async (work, pendingText) => {
    if (busy || transitionLockRef.current) return
    busy = true
    transitionLockRef.current = true
    setTransitioning(true)
    setError('')
    setSlot(errorSlot, '')
    setSlot(statusSlot, pendingText)
    try {
      await work()
    } catch (error) {
      setSlot(statusSlot, '')
      setSlot(errorSlot, error.message || 'DCB request failed', true)
    } finally {
      busy = false
      transitionLockRef.current = false
      setTransitioning(false)
    }
  }

  const { handleClick } = createDcbActionHandlers({
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
    getCurrentStage: () => currentStage,
    setCurrentStage: (st) => {
      currentStage = st
    },
    adaptDcbStageUi,
  })

  shadow.addEventListener('click', handleClick)
  return () => {
    shadow.removeEventListener('click', handleClick)
  }
}

export {
  DCB_STAGES,
  isDcbFlowContext,
  normalizeDcbStage,
  normalizedOutcome,
  pageForDcbOutcome,
  purchaseTypesFrom,
  resolvePurchaseType,
  routeDcbResponse,
  setupDcbBindings,
}
