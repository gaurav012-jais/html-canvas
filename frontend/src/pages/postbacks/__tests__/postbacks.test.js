import { describe, it, expect } from 'vitest'
import { PAGE_SIZE, STATUS_FILTERS } from '../postbackConstants'
import { operatorStatusBadge, delayedChecksubBadge, statusBadge } from '../postbackBadges'

describe('postbacks constants and badges', () => {
  it('exports expected constants', () => {
    expect(PAGE_SIZE).toBe(25)
    expect(STATUS_FILTERS.length).toBeGreaterThan(0)
    expect(STATUS_FILTERS.some((f) => f.id === 'all')).toBe(true)
    expect(STATUS_FILTERS.some((f) => f.id === 'sent')).toBe(true)
  })

  it('operatorStatusBadge returns proper classes', () => {
    expect(operatorStatusBadge('active')).toContain('bg-emerald-50')
    expect(operatorStatusBadge('grace')).toContain('bg-amber-50')
    expect(operatorStatusBadge('unsub')).toContain('bg-slate-100')
    expect(operatorStatusBadge('')).toContain('bg-slate-100')
  })

  it('statusBadge returns proper classes', () => {
    expect(statusBadge('sent')).toContain('bg-emerald-50')
    expect(statusBadge('pending')).toContain('bg-amber-50')
    expect(statusBadge('failed')).toContain('bg-rose-50')
  })

  it('delayedChecksubBadge renders JSX elements', () => {
    const activeBadge = delayedChecksubBadge('completed', 'ACTIVE')
    expect(activeBadge).toBeDefined()
    expect(activeBadge.props.className).toContain('bg-emerald-50')

    const failedBadge = delayedChecksubBadge('failed', 'SUSPENDED')
    expect(failedBadge).toBeDefined()
    expect(failedBadge.props.className).toContain('bg-rose-50')
  })
})
