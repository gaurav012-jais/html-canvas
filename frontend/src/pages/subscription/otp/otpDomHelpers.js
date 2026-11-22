import { formatMsisdnWithCountryCode } from '../../../services/flow/resolvePhoneNumber'

export function getCountryCodeFromDom(phoneInput, shadow) {
  if (phoneInput) {
    const attr =
      phoneInput.getAttribute('data-country-code') ||
      phoneInput.getAttribute('data-phone-prefix')
    if (attr && attr.trim()) return attr.trim()
  }
  if (shadow) {
    const badge = shadow.querySelector('[data-country-code], [data-phone-prefix]')
    if (badge) {
      const val =
        badge.getAttribute('data-country-code') ||
        badge.getAttribute('data-phone-prefix') ||
        ''
      if (val && val.trim()) return val.trim()
    }
  }
  return ''
}

export function capturePhoneFromShadow(shadow, phoneInput) {
  const raw = (phoneInput?.value || '').trim()
  const cleanVal = raw.replace(/\D/g, '')
  if (!cleanVal) return ''
  const countryCode = getCountryCodeFromDom(phoneInput, shadow)
  return formatMsisdnWithCountryCode(cleanVal, countryCode) || cleanVal
}

export function isErrorSlot(el) {
  if (!el) return false
  return (
    el.matches?.(
      '[data-otp-slot="error"], [data-slot="error"], [data-dcb-slot="error"], .wjo-error, .bf-error-slot, .dcb-error-slot, .otp-error-slot, .otp-error',
    ) ||
    el.getAttribute?.('data-otp-slot') === 'error' ||
    el.getAttribute?.('data-slot') === 'error' ||
    el.getAttribute?.('data-dcb-slot') === 'error'
  )
}

export function setErrorText(shadow, verifyBtn, setError, text) {
  const errorSlots = shadow.querySelectorAll(
    '[data-otp-slot="error"], [data-slot="error"], [data-dcb-slot="error"], .wjo-error, .bf-error-slot, .dcb-error-slot, .otp-error-slot, .otp-error',
  )
  if (errorSlots.length > 0) {
    errorSlots.forEach((slot) => {
      slot.textContent = text || ''
      slot.style.color = '#dc2626'
      if (text) {
        slot.hidden = false
        if (slot.style.display === 'none') {
          slot.style.display = ''
        }
      }
    })
  } else if (text && verifyBtn && verifyBtn.parentNode) {
    let fallbackSlot = shadow.querySelector('.otp-injected-error-slot')
    if (!fallbackSlot) {
      fallbackSlot = document.createElement('div')
      fallbackSlot.className = 'otp-injected-error-slot'
      fallbackSlot.style.cssText =
        'min-height:18px;color:#dc2626;font-size:13px;font-weight:600;margin:8px 0;text-align:center;'
      verifyBtn.parentNode.insertBefore(fallbackSlot, verifyBtn)
    }
    fallbackSlot.textContent = text
    fallbackSlot.hidden = false
    fallbackSlot.style.display = ''
  } else {
    const fallbackSlot = shadow.querySelector('.otp-injected-error-slot')
    if (fallbackSlot) {
      fallbackSlot.textContent = ''
    }
  }

  if (typeof setError === 'function') {
    if (errorSlots.length === 0 && !shadow.querySelector('.otp-injected-error-slot')) {
      setError(text || '')
    } else {
      setError('')
    }
  }
}

export function setStatusText(shadow, statusSlot, text) {
  const statusSlots = shadow.querySelectorAll(
    '[data-otp-slot="status"], [data-slot="status"], [data-dcb-slot="status"], .wjo-status, .bf-status-slot, .dcb-status-slot, .otp-status-slot, .otp-status',
  )
  if (statusSlots.length > 0) {
    statusSlots.forEach((slot) => {
      slot.textContent = text || ''
      slot.style.color = '#4b5563'
      if (text) {
        slot.hidden = false
        if (slot.style.display === 'none') {
          slot.style.display = ''
        }
      }
    })
  } else if (statusSlot) {
    statusSlot.textContent = text || ''
    statusSlot.style.color = '#4b5563'
  }
}

export function setSlotText(shadow, verifyBtn, setError, statusSlot, slot, text, isError = false) {
  if (isError || isErrorSlot(slot)) {
    setErrorText(shadow, verifyBtn, setError, text)
  } else {
    setStatusText(shadow, statusSlot, text)
  }
}

export function findContainer(el, otherSelector) {
  if (!el) return null
  const stage = el.closest?.('[data-otp-step], [data-dcb-stage]')
  if (stage) return stage
  const parent = el.parentElement
  if (parent && !parent.querySelector(otherSelector)) {
    return parent
  }
  return el
}
