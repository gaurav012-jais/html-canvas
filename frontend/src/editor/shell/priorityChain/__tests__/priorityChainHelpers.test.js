import { describe, it, expect } from 'vitest'
import {
  defaultApiStep,
  ensureApiRules,
  getCampaignPageOptions,
} from '../priorityChainHelpers'

describe('priorityChainHelpers', () => {
  it('generates standard defaultApiStep with four status checks', () => {
    const step = defaultApiStep()
    expect(step.type).toBe('api')
    expect(step.url).toBe('')
    expect(step.rules).toHaveLength(4)
    expect(step.rules[0]).toEqual({
      key: 'currentStatus',
      value: 'active',
      go: 'page',
      page: 'THANKYOU',
      url: '',
    })
    expect(step.missAction).toBe('page')
    expect(step.missPage).toBe('ERROR')
    expect(step.failAction).toBe('page')
    expect(step.failPage).toBe('ERROR')
  })

  it('ensureApiRules preserves existing valid rules', () => {
    const customStep = {
      type: 'api',
      rules: [
        { key: 'status', value: 'subscribed', go: 'page', page: 'THANKYOU' },
      ],
    }
    const result = ensureApiRules(customStep)
    expect(result.rules).toHaveLength(1)
    expect(result.rules[0].value).toBe('subscribed')
  })

  it('ensureApiRules falls back to default rules when rules are empty or missing', () => {
    const emptyStep = { type: 'api', rules: [] }
    const result = ensureApiRules(emptyStep)
    expect(result.rules).toHaveLength(4)
    expect(result.rules[0].value).toBe('active')
  })

  it('getCampaignPageOptions returns all 8 funnel pages with labels', () => {
    const options = getCampaignPageOptions()
    expect(options.length).toBeGreaterThanOrEqual(8)
    const pageIds = options.map((o) => o.id)
    expect(pageIds).toContain('HOME')
    expect(pageIds).toContain('OTP')
    expect(pageIds).toContain('CONFIRM')
    expect(pageIds).toContain('THANKYOU')
    expect(pageIds).toContain('ERROR')
  })
})
