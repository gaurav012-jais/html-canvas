import { describe, it, expect } from 'vitest'
import {
  clampPayoutPercent,
  buildOtpExposeUrls,
  buildOtpExposeApiPayload,
  buildOtpExposeMarkdownGuide,
  buildOtpExposeApiGuide,
} from '../otp'

describe('otp service and api guide utilities', () => {
  it('clampPayoutPercent clamps values between 0 and 100', () => {
    expect(clampPayoutPercent(120)).toBe(100)
    expect(clampPayoutPercent(-10)).toBe(0)
    expect(clampPayoutPercent(55)).toBe(55)
    expect(clampPayoutPercent('invalid')).toBe(100)
  })

  it('buildOtpExposeUrls formats correct endpoints', () => {
    const urls = buildOtpExposeUrls('https://example.com', '12', '34')
    expect(urls.base).toBe('https://example.com/api/otp/12/34')
    expect(urls.checksubUrl).toBe('https://example.com/api/otp/12/34/checksub?msisdn=')
    expect(urls.sendUrl).toBe('https://example.com/api/otp/12/34/send?msisdn=')
    expect(urls.verifyUrl).toBe('https://example.com/api/otp/12/34/verify?msisdn=&otp=')
  })

  it('buildOtpExposeApiPayload produces valid array of step descriptors', () => {
    const payload = buildOtpExposeApiPayload({
      origin: 'https://test.com',
      campaign: { id: 10, name: 'Test Campaign' },
      vendorId: 5,
    })
    expect(payload).toHaveLength(3)
    expect(payload[0].comment).toContain('Step 0')
    expect(payload[1].comment).toContain('Step 1')
    expect(payload[2].comment).toContain('Step 2')
  })

  it('buildOtpExposeMarkdownGuide returns formatted markdown documentation', () => {
    const md = buildOtpExposeMarkdownGuide({
      origin: 'https://test.com',
      campaign: { id: 10, name: 'Test Campaign' },
      vendor: { id: 5, name: 'Vendor Alpha' },
    })
    expect(md).toContain('# Vendor OTP API Specification')
    expect(md).toContain('Vendor Alpha')
    expect(md).toContain('Test Campaign')
  })

  it('buildOtpExposeApiGuide outputs valid JSON string or markdown', () => {
    const jsonStr = buildOtpExposeApiGuide({ origin: 'https://test.com' })
    const parsed = JSON.parse(jsonStr)
    expect(parsed.apis).toHaveLength(3)

    const md = buildOtpExposeApiGuide({ format: 'markdown' })
    expect(md).toContain('# Vendor OTP API Specification')
  })
})
