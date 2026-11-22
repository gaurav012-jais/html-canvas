import { describe, it, expect, vi } from 'vitest'
import { validateApiUrl, resolveUrlMacros } from '../priorityApiStep'
import { createPriorityNavigators } from '../priorityNavigation'

describe('priorityApiStep utilities', () => {
  it('correctly validates valid API URLs and catches invalid ones', () => {
    expect(() => validateApiUrl('https://example.com/api/check', 'Priority 1')).not.toThrow()
    expect(() => validateApiUrl('/api/local/check', 'Priority 1')).not.toThrow()
    expect(() => validateApiUrl('https://api.test.com/check?msisdn={{msisdn}}', 'Priority 1')).not.toThrow()

    expect(() => validateApiUrl('', 'Priority 1')).toThrow(/missing or incomplete/)
    expect(() => validateApiUrl('https://', 'Priority 1')).toThrow(/missing or incomplete/)
    expect(() => validateApiUrl('http:///', 'Priority 1')).toThrow(/missing or incomplete/)
  })

  it('replaces url macros with correct values', () => {
    const template = 'https://api.com/v1?phone={{phone}}&msisdn={{msisdn}}&c={{country}}&op={{operator}}'
    const resolved = resolveUrlMacros(template, {
      phone: '1234567890',
      country: 'AE',
      operator: 'DU',
    })
    expect(resolved).toBe('https://api.com/v1?phone=1234567890&msisdn=1234567890&c=AE&op=DU')
  })

  it('createPriorityNavigators dispatches page navigation for valid pages', async () => {
    const saveSession = vi.fn()
    const setSearchParams = vi.fn()
    const loadPage = vi.fn().mockResolvedValue(true)
    const onOutcome = vi.fn()

    const nav = createPriorityNavigators({
      tag: 'Priority 1',
      country: 'US',
      operator: 'ATT',
      phoneRef: { current: '9876543210' },
      visitIdRef: { current: 'vis-123' },
      saveSession,
      setSearchParams,
      loadPage,
      onOutcome,
    })

    const handled = await nav.goConfiguredOrContinue('page', 'THANKYOU', 'test reason')
    expect(handled).toBe(true)
    expect(onOutcome).toHaveBeenCalledWith('PASS_THANKYOU')
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'THANKYOU',
        phone: '9876543210',
        visitId: 'vis-123',
      })
    )
    expect(loadPage).toHaveBeenCalledWith('THANKYOU', { direct: true })
  })
})
