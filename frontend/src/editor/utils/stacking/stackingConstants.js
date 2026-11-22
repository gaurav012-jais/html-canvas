/**
 * Constants and CSS rules for overlay stacking.
 */

export const Z_IMAGE = 1
export const Z_OVERLAY = 40
export const Z_HOTSPOT = 50

/** Tight containing block so hotspot % tracks the image, not the page. */
export const IMAGE_BANNER_STYLE = {
  position: 'relative',
  display: 'block',
  width: '100%',
  'max-width': '100%',
  overflow: 'visible',
  height: 'auto',
  'max-height': 'none',
  margin: '0 auto',
  'line-height': '0',
}

/** Grapes must resize in px — height:% against an auto-height banner does not apply. */
export const HOTSPOT_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 10,
  ratioDefault: 0,
  unitWidth: 'px',
  unitHeight: 'px',
  currentUnit: 0,
}

export function clampPct(n, min = 0, max = 100) {
  const v = Number(n)
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, v))
}

/** Keep the user's width/height; shift left/top so the box stays on the image. */
export function fitBoxPct(left, top, width, height) {
  width = clampPct(width, 1, 100)
  height = clampPct(height, 1, 100)
  left = clampPct(left, 0, 100 - width)
  top = clampPct(top, 0, 100 - height)
  return { left, top, width, height }
}

export function pct(n, fallback = 0) {
  const v = Math.max(0, Math.min(100, n))
  return `${Number.isFinite(v) ? v.toFixed(2) : fallback}%`
}

export function defaultHotspotBox(isRight) {
  return {
    left: isRight ? '52%' : '4%',
    top: '55%',
    width: '44%',
    height: '24%',
    right: isRight ? '4%' : '52%',
    bottom: '21%',
  }
}

export function hotspotChrome(style = {}) {
  return {
    ...style,
    position: 'absolute',
    display: 'block',
    'z-index': Z_HOTSPOT,
    'box-sizing': 'border-box',
    'pointer-events': 'auto',
    cursor: 'grab',
  }
}

export function styleToPct(raw, parentSize) {
  if (raw == null || raw === '' || !parentSize) return null
  const s = String(raw).trim()
  if (s.endsWith('%')) {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }
  const px = parseFloat(s)
  if (Number.isFinite(px) && parentSize > 0) {
    return (px / parentSize) * 100
  }
  return null
}

const CAMPAIGN_PAGE_TARGETS = ['HOME', 'OTP', 'CONFIRM', 'THANKYOU']

export function hrefIsNavigationTarget(href) {
  const h = String(href || '').trim()
  if (!h || h === '#') return false
  if (h.startsWith('#')) return true
  if (/^(https?:|mailto:|tel:)/i.test(h)) return true
  if (CAMPAIGN_PAGE_TARGETS.includes(h.toUpperCase())) return true
  return false
}

export function applyBannerHostStyle(comp) {
  if (!comp?.addStyle) return
  comp.addStyle(IMAGE_BANNER_STYLE)
  try {
    const cur = comp.getAttributes() || {}
    comp.setAttributes({ ...cur, 'data-tc-type': 'image-banner' })
  } catch (_) {
    /* ignore */
  }
}

export function ensureImageLayout(img) {
  if (!img?.style) return
  img.style.position = 'relative'
  img.style.zIndex = String(Z_IMAGE)
  img.style.display = 'block'
  img.style.width = '100%'
  img.style.maxWidth = '100%'
  img.style.height = 'auto'
  img.style.maxHeight = 'none'
  img.style.objectFit = 'contain'
  const nw = Number(img.naturalWidth) || 0
  const nh = Number(img.naturalHeight) || 0
  if (nw > 0 && nh > 0) {
    img.style.aspectRatio = `${nw} / ${nh}`
  }
}

export function coverFullBox() {
  return hotspotChrome({
    top: '0%',
    left: '0%',
    width: '100%',
    height: '100%',
    right: '0%',
    bottom: '0%',
  })
}

export function applyCoverFullToEl(el) {
  if (!el?.style) return
  el.style.position = 'absolute'
  el.style.display = 'block'
  el.style.top = '0%'
  el.style.left = '0%'
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.right = '0%'
  el.style.bottom = '0%'
  el.style.boxSizing = 'border-box'
  el.setAttribute('data-tc-cover-full', '1')
}
