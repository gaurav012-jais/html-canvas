import useStore from '../store/useStore'

const METRICS_KEY = 'templatecraft_metrics'

const defaultMetrics = {
  projectsCreated: 0,
  blocksAdded: 0,
  exports: 0,
  saveCount: 0,
  sessionTime: 0,
  sessions: 0,
  otp_sent: 0,
  otp_verified: 0,
  otp_failed: 0,
  confirm_loaded: 0,
  confirm_completed: 0,
  success_loaded: 0,
}

let sessionStart = Date.now()

export function loadMetrics() {
  try {
    const data = localStorage.getItem(METRICS_KEY)
    return data ? { ...defaultMetrics, ...JSON.parse(data) } : { ...defaultMetrics }
  } catch {
    return { ...defaultMetrics }
  }
}

function saveMetrics(metrics) {
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics))
}

export function trackEvent(event, value = 1) {
  const metrics = loadMetrics()
  if (event in metrics) {
    metrics[event] = (metrics[event] || 0) + value
  }
  saveMetrics(metrics)

  // Sync to Zustand store if defined
  if (event === 'saveCount') {
    useStore.setState({ saveCount: metrics.saveCount || 0 })
  } else if (event === 'exports') {
    useStore.setState({ exports: metrics.exports || 0 })
  }
}

export function startSession() {
  sessionStart = Date.now()
  trackEvent('sessions')
}

export function getActiveSessionDuration() {
  return Math.round((Date.now() - sessionStart) / 1000)
}

export function endSession() {
  const duration = getActiveSessionDuration()
  const metrics = loadMetrics()
  metrics.sessionTime = (metrics.sessionTime || 0) + duration
  saveMetrics(metrics)

  useStore.setState({ sessionTime: metrics.sessionTime || 0 })
}

export function getUsageSummary() {
  return loadMetrics()
}

/**
 * Google Ads Conversion Tracking Helper
 * Account: sandeep.mor@tickhigh.com
 * Conversion Action: Purchase conversion page
 */
export const GOOGLE_ADS_ID = 'AW-18398284654'
export const GOOGLE_ADS_PURCHASE_SEND_TO = 'AW-18398284654/AYcUCM31k-QcEO6W_sRE'

const firedTransactions = new Set()

function isAlreadyTracked(transactionId) {
  if (!transactionId) return false
  if (firedTransactions.has(transactionId)) return true
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return Boolean(window.sessionStorage.getItem(`gads_conv_${transactionId}`))
    }
  } catch {
    // Ignore sessionStorage access errors
  }
  return false
}

function markAsTracked(transactionId) {
  if (!transactionId) return
  firedTransactions.add(transactionId)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`gads_conv_${transactionId}`, '1')
    }
  } catch {
    // Ignore sessionStorage access errors
  }
}

export function resetTrackedConversions() {
  firedTransactions.clear()
}

export function trackGoogleAdsConversion({
  transactionId = '',
  value = 1.0,
  currency = 'INR',
  isPreview = false,
} = {}) {
  if (isPreview) {
    return false
  }

  const cleanTxId = String(transactionId || '').trim()

  if (cleanTxId && isAlreadyTracked(cleanTxId)) {
    return false
  }

  const numericValue = Number(value) > 0 ? Number(value) : 1.0
  const currencyCode = String(currency || 'INR').trim().toUpperCase()

  const payload = {
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
    value: numericValue,
    currency: currencyCode,
  }

  if (cleanTxId) {
    payload.transaction_id = cleanTxId
  }

  if (typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', payload)
    } else {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push(['event', 'conversion', payload])
    }
  }

  if (cleanTxId) {
    markAsTracked(cleanTxId)
  }

  return true
}
