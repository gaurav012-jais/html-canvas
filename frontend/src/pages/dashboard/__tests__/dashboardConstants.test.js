import { describe, it, expect } from 'vitest'
import {
  DASHBOARD_DATE_PRESETS,
  EVENT_COLOR_MAP,
  FUNNEL_FROM_STATS,
  operatorBarColor,
  getEventTypeBadgeClass,
  getOperatorStatusBadgeClass,
  getStatusBadgeClass,
} from '../dashboardConstants'

describe('dashboard / dashboardConstants', () => {
  it('provides expected date presets and color maps', () => {
    expect(DASHBOARD_DATE_PRESETS.map((p) => p.id)).toEqual([
      'today',
      'yesterday',
      'week',
      'month',
      'custom',
    ])
    expect(EVENT_COLOR_MAP.VISIT).toBe('#3b82f6')
    expect(FUNNEL_FROM_STATS.length).toBe(5)
  })

  it('assigns operator bar colors correctly', () => {
    expect(operatorBarColor('active')).toBe('#10b981')
    expect(operatorBarColor('grace')).toBe('#f59e0b')
    expect(operatorBarColor('cancelled')).toBe('#64748b')
    expect(operatorBarColor('failed')).toBe('#ef4444')
    expect(operatorBarColor('custom_other')).toBe('#6366f1')
  })

  it('assigns badge classes for event types, operator status, and general status', () => {
    expect(getEventTypeBadgeClass('SUBSCRIBE_SUCCESS')).toContain('emerald')
    expect(getEventTypeBadgeClass('ERROR_LIMIT')).toContain('rose')
    expect(getOperatorStatusBadgeClass('active')).toContain('emerald')
    expect(getOperatorStatusBadgeClass('grace')).toContain('amber')
    expect(getStatusBadgeClass('ACTIVE')).toContain('emerald')
    expect(getStatusBadgeClass('PENDING')).toContain('amber')
    expect(getStatusBadgeClass('FAILED')).toContain('rose')
  })
})
