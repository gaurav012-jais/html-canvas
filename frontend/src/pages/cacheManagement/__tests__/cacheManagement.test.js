import { describe, it, expect } from 'vitest'
import { PRESET_SCOPES } from '../cacheConstants'

describe('cacheManagement constants', () => {
  it('exports expected preset scopes', () => {
    expect(Array.isArray(PRESET_SCOPES)).toBe(true)
    expect(PRESET_SCOPES.length).toBe(4)

    const ids = PRESET_SCOPES.map((s) => s.id)
    expect(ids).toContain('flow')
    expect(ids).toContain('campaign')
    expect(ids).toContain('detection')
    expect(ids).toContain('otp')
  })

  it('each scope has valid pattern and title', () => {
    PRESET_SCOPES.forEach((s) => {
      expect(s.title).toBeTruthy()
      expect(s.pattern).toBeTruthy()
      expect(s.icon).toBeDefined()
    })
  })
})
