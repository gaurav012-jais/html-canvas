import { describe, it, expect } from 'vitest'
import {
  FILTERS,
  HIT_FILTERS,
  VIEWS,
  GROUP_BY,
  PAGE_SIZE,
  ynClass,
  rowKeyOf,
  groupByDate,
} from '../dayLogConstants'

describe('postbackDayLogs constants and helpers', () => {
  it('exports expected filter lists and views', () => {
    expect(Array.isArray(FILTERS)).toBe(true)
    expect(FILTERS.some((f) => f.id === 'all')).toBe(true)
    expect(FILTERS.some((f) => f.id === 'he_fail_cg')).toBe(true)
    expect(Array.isArray(HIT_FILTERS)).toBe(true)
    expect(Array.isArray(VIEWS)).toBe(true)
    expect(Array.isArray(GROUP_BY)).toBe(true)
    expect(PAGE_SIZE).toBe(50)
  })

  it('ynClass returns correct status styles', () => {
    expect(ynClass(false, true)).toContain('bg-rose-50')
    expect(ynClass(true, false)).toContain('bg-emerald-50')
    expect(ynClass(false, false)).toContain('bg-amber-50')
  })

  it('rowKeyOf derives key correctly', () => {
    expect(rowKeyOf({ rowKey: 'custom-key' })).toBe('custom-key')
    expect(rowKeyOf({ msisdn: '9876543210' })).toBe('9876543210')
    expect(rowKeyOf({ visitId: 42 })).toBe('visit:42')
    expect(rowKeyOf({ clickId: 'clk123' })).toBe('click:clk123')
  })

  it('groupByDate groups rows by date', () => {
    const rows = [
      { date: '2026-11-20', id: 1 },
      { date: '2026-11-20', id: 2 },
      { date: '2026-11-21', id: 3 },
    ]
    const grouped = groupByDate(rows, 'Asia/Kolkata', (r) => r.date)
    expect(grouped).toHaveLength(2)
    expect(grouped[0].date).toBe('2026-11-20')
    expect(grouped[0].rows).toHaveLength(2)
    expect(grouped[1].date).toBe('2026-11-21')
    expect(grouped[1].rows).toHaveLength(1)
  })
})
