import { describe, it, expect } from 'vitest'
import {
  FLOW_SPECS,
  isForeignFlowEvent,
  eventLabel,
  statusLabel,
  resolveInterval,
  getEventBadgeClass,
  getStatusBadgeClass,
  seriesColor,
} from '../logConstants'

describe('campaignLogs / logConstants', () => {
  it('provides all expected flow specs', () => {
    expect(FLOW_SPECS.ORANGE_BF).toBeDefined()
    expect(FLOW_SPECS.UNIVERSE_DCB).toBeDefined()
    expect(FLOW_SPECS.OTP_ONLY).toBeDefined()
    expect(FLOW_SPECS.HEADER_INJECTION).toBeDefined()
    expect(FLOW_SPECS.NONE).toBeDefined()
    expect(FLOW_SPECS.CG_HOME).toBeDefined()
  })

  it('correctly detects foreign flow events', () => {
    expect(isForeignFlowEvent('API_DCB_PINCODE', 'ORANGE_BF')).toBe(true)
    expect(isForeignFlowEvent('API_ORANGE_BF_OTP_SEND', 'ORANGE_BF')).toBe(false)
    expect(isForeignFlowEvent('API_HE_TOKEN', 'UNIVERSE_DCB')).toBe(true)
    expect(isForeignFlowEvent('VISIT', 'UNIVERSE_DCB')).toBe(false)
    expect(isForeignFlowEvent('ANYTHING', null)).toBe(false)
  })

  it('formats event labels per flow type', () => {
    expect(eventLabel('VISIT', 'ORANGE_BF')).toBe('Ad Visit (Landing)')
    expect(eventLabel('CONFIRM_VIEW', 'ORANGE_BF')).toBe('Screen 2: Confirm Pack')
    expect(eventLabel('API_DCB_PINCODE', 'UNIVERSE_DCB')).toBe('API: Send PIN (Universe DCB)')
    expect(eventLabel('CUSTOM_TEST_EVENT')).toBe('CUSTOM TEST EVENT')
  })

  it('formats status labels per flow type', () => {
    expect(statusLabel('SUBSCRIBED', 'ORANGE_BF')).toBe('4. Subscribed & Charged (Success)')
    expect(statusLabel('ACTIVE', 'UNIVERSE_DCB')).toBe('Active Subscriber')
    expect(statusLabel('CUSTOM_STATUS', 'NONE')).toBe('CUSTOM_STATUS')
  })

  it('resolves proper interval based on preset and date range', () => {
    expect(resolveInterval('all', '2026-01-01', '2026-01-31')).toBe('day')
    expect(resolveInterval('today', '2026-01-01', '2026-01-01')).toBe('hour')
    expect(resolveInterval('custom', '2026-01-01', '2026-01-01')).toBe('hour')
    expect(resolveInterval('custom', '2026-01-01', '2026-01-05')).toBe('day')
  })

  it('returns valid badge classes for events and statuses', () => {
    expect(getEventBadgeClass('SUBSCRIBE_SUCCESS')).toContain('emerald')
    expect(getEventBadgeClass('SUBSCRIBE_FAILED')).toContain('rose')
    expect(getStatusBadgeClass('ACTIVE')).toContain('emerald')
    expect(getStatusBadgeClass('FAILED')).toContain('rose')
  })

  it('returns cycling colors for series', () => {
    expect(seriesColor(0)).toBe('#3b82f6')
    expect(seriesColor(1)).toBe('#f59e0b')
  })
})
