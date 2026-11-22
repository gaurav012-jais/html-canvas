import { describe, it, expect, beforeEach } from 'vitest'
import { getResendAttempts, recordResendAttempt } from '../otpSession'

describe('otpSession utilities', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns 0 when no session data exists', () => {
    expect(getResendAttempts('AE', 'DU')).toBe(0)
  })

  it('records and retrieves resend attempts', () => {
    recordResendAttempt('AE', 'DU', '971501234567', 2)
    expect(getResendAttempts('AE', 'DU')).toBe(2)

    const raw = sessionStorage.getItem('tc_session_AE_DU')
    const parsed = JSON.parse(raw)
    expect(parsed.resendAttempts).toBe(2)
    expect(parsed.phone).toBe('971501234567')
  })

  it('handles corrupted session storage safely', () => {
    sessionStorage.setItem('tc_session_AE_DU', 'not-json')
    expect(getResendAttempts('AE', 'DU')).toBe(0)
  })
})
