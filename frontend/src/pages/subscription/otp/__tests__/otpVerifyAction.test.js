import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOtpVerifyHandler } from '../otpVerifyAction'

const { mockVerifyOtp, mockPersistPhone, mockTrackEvent } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
  mockPersistPhone: vi.fn(),
  mockTrackEvent: vi.fn(),
}))

vi.mock('../../../../services/api/otp', () => ({
  verifyOtp: mockVerifyOtp,
}))

vi.mock('../../../../services/flow/resolvePhoneNumber', () => ({
  formatMsisdnWithCountryCode: (phone, cc) => (phone ? `${cc || '971'}${phone}` : ''),
  persistPhone: mockPersistPhone,
  resolvePhoneFromStorage: () => '',
}))

vi.mock('../../../../utils/tracking', () => ({
  trackEvent: mockTrackEvent,
}))

vi.mock('../otpDomHelpers', () => ({
  getCountryCodeFromDom: () => '971',
}))

function createHandlerHarness(overrides = {}) {
  const shadow = document.createElement('div')
  const phoneInput = document.createElement('input')
  phoneInput.value = '501234567'
  const otpInput = document.createElement('input')
  otpInput.value = '1234'
  const verifyBtn = document.createElement('button')
  verifyBtn.innerHTML = 'Verify & Continue'
  const errorSlot = document.createElement('div')
  const statusSlot = document.createElement('div')
  statusSlot.textContent = 'Ready'

  const phoneRef = { current: '' }
  const pageCacheRef = { current: new Map([['CONFIRM', {}], ['THANKYOU', {}]]) }
  const setPhone = vi.fn()
  const transitionFlow = vi.fn().mockResolvedValue({ pageType: 'THANKYOU' })
  const loadPage = vi.fn().mockResolvedValue(undefined)
  const cachePage = vi.fn()
  const updateSlot = vi.fn((slot, text) => {
    if (slot) slot.textContent = text
  })

  const handler = createOtpVerifyHandler({
    shadow,
    phoneInput,
    otpInput,
    verifyBtn,
    errorSlot,
    statusSlot,
    country: 'AE',
    operator: 'DU',
    campid: '42',
    trackingCampid: '42',
    visitIdRef: { current: 777 },
    phoneRef,
    packRef: { current: 'daily' },
    setPhone,
    pageCacheRef,
    setTransitioning: vi.fn(),
    transitionLockRef: { current: false },
    transitionFlow,
    cachePage,
    loadPage,
    updateSlot,
    ...overrides,
  })

  return {
    handler,
    verifyBtn,
    errorSlot,
    statusSlot,
    phoneRef,
    pageCacheRef,
    setPhone,
    transitionFlow,
    loadPage,
    cachePage,
    updateSlot,
  }
}

describe('createOtpVerifyHandler', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('uses action CONTINUE, syncs phone/cache, and routes after verify', async () => {
    mockVerifyOtp.mockResolvedValue({ success: true })
    const h = createHandlerHarness()

    await h.handler({ preventDefault: vi.fn() })

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      phone: '971501234567',
      otp: '1234',
      visitId: 777,
      pack: 'daily',
    })
    expect(h.phoneRef.current).toBe('971501234567')
    expect(h.setPhone).toHaveBeenCalledWith('971501234567')
    expect(mockPersistPhone).toHaveBeenCalledWith('971501234567')
    expect(h.pageCacheRef.current.has('CONFIRM')).toBe(false)
    expect(h.pageCacheRef.current.has('THANKYOU')).toBe(false)
    expect(h.transitionFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        fromPage: 'OTP',
        action: 'CONTINUE',
        phone: '971501234567',
      }),
    )
    expect(h.cachePage).toHaveBeenCalledWith({ pageType: 'THANKYOU' })
  })

  it('redirects externally when transition returns externalRedirect', async () => {
    mockVerifyOtp.mockResolvedValue({ success: true })
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { assign: assignMock },
    })

    const transitionFlow = vi
      .fn()
      .mockResolvedValue({ externalRedirect: 'https://carrier.example/success' })
    const h = createHandlerHarness({ transitionFlow })

    await h.handler({ preventDefault: vi.fn() })

    expect(assignMock).toHaveBeenCalledWith('https://carrier.example/success')
    expect(h.cachePage).not.toHaveBeenCalled()
  })

  it('falls back to HOME directly when next pageType resolves back to OTP', async () => {
    mockVerifyOtp.mockResolvedValue({ success: true })
    const transitionFlow = vi.fn().mockResolvedValue({ pageType: 'OTP' })
    const h = createHandlerHarness({ transitionFlow })

    await h.handler({ preventDefault: vi.fn() })

    expect(h.loadPage).toHaveBeenCalledWith('HOME', { direct: true })
  })

  it('shows error, tracks otp_failed, and resets button without transitioning on failure', async () => {
    mockVerifyOtp.mockRejectedValue(new Error('Invalid OTP code'))
    const h = createHandlerHarness()

    await h.handler({ preventDefault: vi.fn() })

    expect(mockTrackEvent).toHaveBeenCalledWith('otp_failed')
    expect(h.transitionFlow).not.toHaveBeenCalled()
    expect(h.loadPage).not.toHaveBeenCalled()
    expect(h.errorSlot.textContent).toBe('Invalid OTP code')
    expect(h.statusSlot.textContent).toBe('Ready')
    expect(h.verifyBtn.disabled).toBe(false)
    expect(h.verifyBtn.textContent).toBe('Verify & Continue')
  })
})
