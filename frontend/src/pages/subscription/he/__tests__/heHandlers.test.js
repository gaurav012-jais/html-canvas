import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  syncUniverseDcbSession,
  updateTrackingSearchParams,
  syncPhoneToUrlParams,
} from '../heOutcomeHandlers'
import { evaluateHeWarning } from '../heWarning'

describe('heOutcomeHandlers and heWarning utilities', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('syncUniverseDcbSession writes session data for UNIVERSE_DCB mode', () => {
    syncUniverseDcbSession('AE', 'DU', 'UNIVERSE_DCB', {
      stage: 'PIN_REQUIRED',
      purchaseTypeId: 'PT_123',
    })

    const raw = sessionStorage.getItem('tc_session_AE_DU')
    const parsed = JSON.parse(raw)
    expect(parsed.msisdnSource).toBe('HE')
    expect(parsed.dcbStage).toBe('PIN_REQUIRED')
    expect(parsed.purchaseTypeId).toBe('PT_123')
  })

  it('updateTrackingSearchParams updates params when tracking values are provided', () => {
    const setSearchParams = vi.fn()
    updateTrackingSearchParams(setSearchParams, {
      heVisitId: 101,
      heClickId: 'clk-456',
      heRcid: 'rc-789',
    })
    expect(setSearchParams).toHaveBeenCalled()
  })

  it('evaluateHeWarning returns true and logs when phone is resolving', () => {
    const res = evaluateHeWarning({
      meta: { done: false },
      phoneResolving: true,
      phone: '',
      setSearchParams: vi.fn(),
      loadPageRef: { current: vi.fn() },
      setError: vi.fn(),
    })
    expect(res).toBe(true)
  })

  it('evaluateHeWarning returns false if phone is present and no redirect needed', () => {
    const res = evaluateHeWarning({
      meta: { done: true, verificationMode: 'NONE' },
      phoneResolving: false,
      phone: '971501234567',
      setSearchParams: vi.fn(),
      loadPageRef: { current: vi.fn() },
      setError: vi.fn(),
    })
    expect(res).toBe(false)
  })
})
