import { describe, it, expect } from 'vitest'
import {
  statusClass,
  eventPack,
  parseJsonish,
  eventDescription,
  categorizeTimelineItem,
  getRequestPayload,
} from '../sessionDetailHelpers'

describe('sessionDetail / sessionDetailHelpers', () => {
  it('assigns correct status classes', () => {
    expect(statusClass('ACTIVE')).toContain('emerald')
    expect(statusClass('SUBSCRIBED')).toContain('emerald')
    expect(statusClass('FAILED')).toContain('rose')
    expect(statusClass('PENDING')).toContain('amber')
    expect(statusClass('OTHER_NEUTRAL')).toContain('gray')
    expect(statusClass('UNKNOWN')).toContain('rose')
  })

  it('extracts pack correctly', () => {
    expect(eventPack({ pack: 'DAILY_100' })).toBe('daily_100')
    expect(eventPack({ planId: 'WEEKLY' })).toBe('weekly')
    expect(eventPack(null)).toBe('')
  })

  it('safely parses jsonish strings', () => {
    expect(parseJsonish('{"foo":"bar"}')).toEqual({ foo: 'bar' })
    expect(parseJsonish({ foo: 'bar' })).toEqual({ foo: 'bar' })
    expect(parseJsonish('invalid-json')).toBeNull()
    expect(parseJsonish(null)).toBeNull()
  })

  it('provides descriptions for standard events', () => {
    expect(eventDescription('VISIT')).toContain('landed')
    expect(eventDescription('OTP_SEND')).toContain('OTP')
    expect(eventDescription('UNKNOWN_CUSTOM_EVENT')).toBeNull()
  })

  it('extracts request payloads from body or url params', () => {
    expect(getRequestPayload({ requestBody: { msisdn: '123' } })).toEqual({ msisdn: '123' })
    expect(getRequestPayload({ requestUrl: 'https://example.com/api?foo=bar&baz=1' })).toEqual({
      foo: 'bar',
      baz: '1',
    })
    expect(getRequestPayload(null)).toBeNull()
  })

  it('categorizes timeline items into standard 4-step funnel', () => {
    expect(categorizeTimelineItem({ eventType: 'VISIT' }).stepIndex).toBe(1)
    expect(categorizeTimelineItem({ eventType: 'SUBSCRIBE_CLICK' }).stepIndex).toBe(2)
    expect(categorizeTimelineItem({ eventType: 'OTP_SEND' }).stepIndex).toBe(3)
    expect(categorizeTimelineItem({ eventType: 'CHECKSUB_30M' }).stepIndex).toBe(4)
    expect(categorizeTimelineItem({ eventType: 'POSTBACK_SENT' }).stepIndex).toBe(4)
  })
})
