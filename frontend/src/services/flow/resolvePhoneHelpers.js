const URL_KEYS = ['msisdn', 'phone', 'mobile', 'mob', 'MSISDN']
const STORAGE_KEYS = ['templatecraft_msisdn', 'msisdn', 'phone', 'mobile']

export function normalizeMsisdn(value) {
  if (value == null || value === '') return ''
  return String(value).replace(/\D/g, '')
}

/**
 * Resolves full MSISDN with country code prefix if configured.
 * Prepend country code (e.g. 962 + 791234567 -> 962791234567).
 * Avoids double-prepending if user already typed the full number.
 * Strips leading national zero (e.g. 0791234567 -> 962791234567).
 */
export function formatMsisdnWithCountryCode(rawPhone, countryCode) {
  const cleanPhone = normalizeMsisdn(rawPhone)
  if (!cleanPhone) return ''
  const cleanCode = normalizeMsisdn(countryCode)
  if (!cleanCode) return cleanPhone

  if (cleanPhone.startsWith(cleanCode) && cleanPhone.length > cleanCode.length + 4) {
    return cleanPhone
  }

  const withoutLeadingZero = cleanPhone.replace(/^0+/, '')
  if (withoutLeadingZero.startsWith(cleanCode) && withoutLeadingZero.length > cleanCode.length + 4) {
    return withoutLeadingZero
  }

  return `${cleanCode}${withoutLeadingZero}`
}

export function resolvePhoneFromUrl(searchParams) {
  if (!searchParams) return ''
  for (const key of URL_KEYS) {
    const raw = searchParams.get(key)
    if (raw) return normalizeMsisdn(raw)
  }
  return ''
}

export function resolvePhoneFromStorage() {
  if (typeof window === 'undefined') return ''
  for (const key of STORAGE_KEYS) {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key)
    if (raw) return normalizeMsisdn(raw)
  }
  return ''
}

export function resolvePhoneFromWindow() {
  if (typeof window === 'undefined') return ''
  const candidates = [window.__TC_MSISDN__, window.__MSISDN__, window.msisdn]
  for (const value of candidates) {
    if (value) return normalizeMsisdn(value)
  }
  return ''
}

export function persistPhone(phone) {
  if (!phone || typeof window === 'undefined') return
  try {
    sessionStorage.setItem('templatecraft_msisdn', phone)
  } catch {
    /* ignore quota / private mode */
  }
}

/** Absolute http(s) HE redirect only. */
export function isHeRedirectUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

/**
 * Prefer backend-resolved failRedirectUrl (already includes CG fallback for API HE).
 * cgRedirectUrl is a secondary FE fallback if older backends omit failRedirectUrl.
 */
export function pickHeFailRedirectUrl({ failRedirectUrl, cgRedirectUrl } = {}) {
  if (isHeRedirectUrl(failRedirectUrl)) return String(failRedirectUrl).trim()
  if (isHeRedirectUrl(cgRedirectUrl)) return String(cgRedirectUrl).trim()
  return ''
}

/**
 * Open HE success/fail URL as configured.
 * Never auto-append click_id / campid / rcid. Fill placeholders already in
 * the URL ({click_id}, {msisdn}, …); do not add query params.
 */
export function appendHeAttributionToUrl(rawUrl, attrs = {}) {
  let url = String(rawUrl || '').trim()
  if (!isHeRedirectUrl(url)) return ''

  const msisdn = normalizeMsisdn(attrs.msisdn || attrs.phone || '')
  const clickId = String(attrs.clickId || attrs.click_id || '').trim()
  const rcid = String(attrs.rcid || '').trim()
  const campid =
    attrs.campid != null && attrs.campid !== '' ? String(attrs.campid) : ''
  const trackingCampid =
    attrs.trackingCampid != null && attrs.trackingCampid !== ''
      ? String(attrs.trackingCampid)
      : attrs.tracking_campid != null && attrs.tracking_campid !== ''
        ? String(attrs.tracking_campid)
        : ''
  const vars = {
    msisdn,
    phone: msisdn,
    click_id: clickId,
    clickId,
    rcid,
    campid,
    tracking_campid: trackingCampid,
  }
  for (const [key, val] of Object.entries(vars)) {
    url = url.split(`{{${key}}}`).join(encodeURIComponent(val))
    url = url.split(`{${key}}`).join(encodeURIComponent(val))
  }
  return url
}

export async function resolveCustomHook() {
  if (typeof window === 'undefined') return ''
  const resolver = window.__templatecraft_resolvePhone
  if (typeof resolver !== 'function') return ''
  try {
    const result = await resolver()
    return normalizeMsisdn(result)
  } catch (err) {
    console.warn('[resolvePhoneNumber] custom hook failed:', err)
    return ''
  }
}

export function redirectFields(operatorRes) {
  if (!operatorRes) {
    return {
      failRedirectUrl: null,
      successRedirectUrl: null,
      cgRedirectUrl: null,
      nextPage: null,
      visitId: null,
      clickId: null,
      rcid: null,
      campaignId: null,
      verificationMode: null,
      flowContext: null,
    }
  }
  return {
    failRedirectUrl: operatorRes.failRedirectUrl || null,
    successRedirectUrl: operatorRes.successRedirectUrl || null,
    cgRedirectUrl: operatorRes.cgRedirectUrl || null,
    nextPage: operatorRes.nextPage || null,
    visitId: operatorRes.visitId || null,
    clickId: operatorRes.clickId || null,
    rcid: operatorRes.rcid || null,
    campaignId: operatorRes.campaignId || null,
    verificationMode: operatorRes.verificationMode || null,
    flowContext: operatorRes.flowContext || null,
  }
}

export function detectDecisionFields(operatorRes) {
  return {
    subscribed: operatorRes?.subscribed,
    isActive: Boolean(operatorRes?.isActive),
    subscriptionStatus: operatorRes?.subscriptionStatus || null,
    blocked: Boolean(operatorRes?.blocked),
    blockReason: operatorRes?.blockReason || null,
  }
}

export function isApiHeProviderName(heProvider) {
  const p = String(heProvider || '').toLowerCase()
  return p === 'safaricom_masked' || p === 'custom_http' || p === 'custom'
}
