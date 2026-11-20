import { describe, it, expect } from 'vitest'
import {
  getClickActionType,
  isLockedSystemAction,
  getCampaignPageOptions,
} from '../ClickActionEditor'

describe('ClickActionEditor utils', () => {
  it('correctly classifies click action types from component attributes', () => {
    expect(getClickActionType({ 'data-action': 'CHAIN' })).toBe('chain')
    expect(getClickActionType({ 'data-actions': '[]' })).toBe('chain')
    expect(getClickActionType({ 'data-action': 'SUBSCRIBE_ROUTE' })).toBe('subscribeRoute')
    expect(getClickActionType({ 'data-action': 'SUBSCRIBE' })).toBe('flow')
    expect(getClickActionType({ 'data-action': 'CONFIRM' })).toBe('flow')
    expect(getClickActionType({ href: 'https://example.com' })).toBe('external')
    expect(getClickActionType({ href: 'mailto:support@example.com' })).toBe('external')
    expect(getClickActionType({ href: '#section-hero' })).toBe('anchor')
    expect(getClickActionType({ href: 'OTP' })).toBe('page')
    expect(getClickActionType({ href: 'THANKYOU' })).toBe('page')
    expect(getClickActionType({})).toBe('none')
    expect(getClickActionType({ href: '' })).toBe('none')
  })

  it('accurately identifies system locked actions', () => {
    expect(isLockedSystemAction({ 'data-otp-action': 'verify' })).toBe(true)
    expect(isLockedSystemAction({ 'data-otp-field': 'phone' })).toBe(true)
    expect(isLockedSystemAction({ 'data-otp-slot': '1' })).toBe(true)
    expect(isLockedSystemAction({ 'data-flow-pack-picker': 'true' })).toBe(true)
    expect(isLockedSystemAction({})).toBe(false)
    expect(isLockedSystemAction({ 'data-action': 'SUBSCRIBE' })).toBe(false)
  })

  it('returns valid campaign page options list', () => {
    const pages = getCampaignPageOptions()
    expect(pages.length).toBeGreaterThanOrEqual(8)
    expect(pages.find((p) => p.id === 'HOME')).toBeDefined()
    expect(pages.find((p) => p.id === 'OTP')).toBeDefined()
  })
})
