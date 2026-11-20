import { describe, it, expect } from 'vitest'
import {
  dcbPageLabel,
  orangeBfPageLabel,
  orangeBfPageSubtitle,
  PAGE_TYPES,
} from '../builder/builderUtils'

describe('builderUtils', () => {
  it('provides correct labels for dcb and orangeBf pages', () => {
    expect(dcbPageLabel('OTP')).toBe('Number then PIN')
    expect(dcbPageLabel('HOME')).toBe('Choose pack')
    expect(orangeBfPageLabel('HOME')).toBe('Enter PIN / Number')
    expect(orangeBfPageLabel('CONFIRM')).toBe('Confirm / Plan')
    expect(orangeBfPageLabel('OTP')).toBe('Verify PIN / OTP')
    expect(orangeBfPageLabel('THANKYOU')).toBe('Thank you')
    expect(orangeBfPageSubtitle('HOME')).toBe('Enter mobile number')
  })

  it('includes standard page types list', () => {
    expect(PAGE_TYPES).toContain('HOME')
    expect(PAGE_TYPES).toContain('OTP')
    expect(PAGE_TYPES).toContain('CONFIRM')
    expect(PAGE_TYPES).toContain('THANKYOU')
  })
})
