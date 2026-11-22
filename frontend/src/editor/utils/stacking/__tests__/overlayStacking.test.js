import { describe, it, expect } from 'vitest'
import {
  Z_IMAGE,
  Z_OVERLAY,
  Z_HOTSPOT,
  clampPct,
  fitBoxPct,
  pct,
  styleToPct,
  hrefIsNavigationTarget,
  isImageComponent,
  isHotspotComponent,
  isImageBannerHost,
  remapHotspotToAnchor,
  normalizeHotspotBox,
  hasPercentGeometry,
} from '../../overlayStacking'

describe('overlayStacking facade and submodules', () => {
  it('exposes correct stacking z-index hierarchy', () => {
    expect(Z_HOTSPOT).toBeGreaterThan(Z_OVERLAY)
    expect(Z_OVERLAY).toBeGreaterThan(Z_IMAGE)
  })

  it('correctly clamps and fits percentages within container bounds', () => {
    expect(clampPct(-10)).toBe(0)
    expect(clampPct(150)).toBe(100)
    expect(clampPct(45.5)).toBe(45.5)

    const fitted = fitBoxPct(90, 95, 30, 20)
    expect(fitted.left).toBeLessThanOrEqual(70)
    expect(fitted.top).toBeLessThanOrEqual(80)
    expect(fitted.width).toBe(30)
    expect(fitted.height).toBe(20)

    expect(pct(42.1234)).toBe('42.12%')
    expect(pct(150)).toBe('100.00%')
    expect(pct(-5)).toBe('0.00%')
  })

  it('parses CSS style properties to percentage correctly', () => {
    expect(styleToPct('50%', 200)).toBe(50)
    expect(styleToPct('100px', 400)).toBe(25)
    expect(styleToPct('', 400)).toBeNull()
    expect(styleToPct(null, 400)).toBeNull()
  })

  it('validates navigation href target formats', () => {
    expect(hrefIsNavigationTarget('#anchor')).toBe(true)
    expect(hrefIsNavigationTarget('https://google.com')).toBe(true)
    expect(hrefIsNavigationTarget('OTP')).toBe(true)
    expect(hrefIsNavigationTarget('THANKYOU')).toBe(true)
    expect(hrefIsNavigationTarget('#')).toBe(false)
    expect(hrefIsNavigationTarget('')).toBe(false)
    expect(hrefIsNavigationTarget(null)).toBe(false)
  })

  it('correctly detects component types', () => {
    const imgComp = {
      tagName: 'IMG',
      getAttributes: () => ({}),
    }
    expect(isImageComponent(imgComp)).toBe(true)

    const hotspotComp = {
      tagName: 'A',
      getAttributes: () => ({ 'data-tc-type': 'hotspot' }),
    }
    expect(isHotspotComponent(hotspotComp)).toBe(true)

    const bannerHost = {
      getAttribute: (k) => (k === 'data-tc-type' ? 'image-banner' : null),
    }
    expect(isImageBannerHost(bannerHost)).toBe(true)
  })

  it('normalizes hotspot box dimensions to relative percentages', () => {
    const parentEl = {
      clientWidth: 400,
      clientHeight: 800,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 800 }),
    }
    const hotspotEl = {
      style: { left: '40px', top: '80px', width: '200px', height: '100px' },
      getBoundingClientRect: () => ({ left: 40, top: 80, width: 200, height: 100 }),
    }

    const box = normalizeHotspotBox(hotspotEl, parentEl)
    expect(box).not.toBeNull()
    expect(box.left).toBe('10.00%')
    expect(box.top).toBe('10.00%')
    expect(box.width).toBe('50.00%')
    expect(box.height).toBe('12.50%')
    expect(box.position).toBe('absolute')
  })

  it('validates percentage geometry check', () => {
    const elWithPct = {
      style: { left: '10%', top: '20%', width: '50%', height: '30%' },
    }
    expect(hasPercentGeometry(elWithPct)).toBe(true)

    const elWithPx = {
      style: { left: '10px', top: '20%', width: '50%', height: '30%' },
    }
    expect(hasPercentGeometry(elWithPx)).toBe(false)
  })
})
