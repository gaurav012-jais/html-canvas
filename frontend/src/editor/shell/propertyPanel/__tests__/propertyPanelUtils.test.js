import { describe, it, expect } from 'vitest'
import { toHex, getButtonSize, KIND_LABELS } from '../propertyPanelUtils'
import { clampPropsWidth } from '../panelState'

describe('propertyPanelUtils & panelState', () => {
  it('converts colors to hex format accurately', () => {
    expect(toHex('#123456')).toBe('#123456')
    expect(toHex('#abc')).toBe('#aabbcc')
    expect(toHex('rgb(255, 0, 128)')).toBe('#ff0080')
    expect(toHex('')).toBe('#334155')
  })

  it('calculates button size based on padding', () => {
    expect(getButtonSize('8px 16px')).toBe('sm')
    expect(getButtonSize('16px 32px')).toBe('lg')
    expect(getButtonSize('12px 24px')).toBe('md')
  })

  it('clamps property panel width within allowed bounds', () => {
    expect(clampPropsWidth(100)).toBe(240)
    expect(clampPropsWidth(1000)).toBe(560)
    expect(clampPropsWidth(320)).toBe(320)
  })

  it('has valid kind labels map', () => {
    expect(KIND_LABELS.button).toBe('Button')
    expect(KIND_LABELS.text).toBe('Text')
    expect(KIND_LABELS.hotspot).toBe('Clickable Area')
  })
})
