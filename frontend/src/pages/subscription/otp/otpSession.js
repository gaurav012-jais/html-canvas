export function getResendAttempts(country, operator) {
  try {
    const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed.resendAttempts === 'number') {
        return parsed.resendAttempts
      }
    }
  } catch {
    /* ignore malformed session state */
  }
  return 0
}

export function recordResendAttempt(country, operator, msisdn, attempts) {
  try {
    const saved = sessionStorage.getItem(`tc_session_${country}_${operator}`)
    const sessionObj = saved ? JSON.parse(saved) : {}
    sessionObj.resendAttempts = attempts
    sessionObj.phone = msisdn
    sessionStorage.setItem(`tc_session_${country}_${operator}`, JSON.stringify(sessionObj))
  } catch {
    /* ignore storage write failures */
  }
}
