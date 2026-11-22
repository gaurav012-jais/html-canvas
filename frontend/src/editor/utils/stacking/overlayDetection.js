import { getComp } from '../editorUtils'
import { Z_IMAGE, Z_OVERLAY } from './stackingConstants'

export function isImageComponent(component) {
  const comp = getComp(component)
  if (!comp) return false
  const tag = (typeof comp.get === 'function' ? comp.get('tagName') : comp.tagName) || ''
  const type = (typeof comp.get === 'function' ? comp.get('type') : comp.type) || ''
  const tc = comp.getAttributes?.()?.['data-tc-type']
  const tagLower = tag.toLowerCase()
  return tagLower === 'img' || type === 'image' || tc === 'image' || tc === 'image-banner'
}

export function isHotspotComponent(component) {
  const comp = getComp(component)
  if (!comp) return false
  return comp.getAttributes?.()?.['data-tc-type'] === 'hotspot'
}

export function isImageBannerHost(target) {
  if (!target) return false
  if (typeof target.getAttribute === 'function') {
    return target.getAttribute('data-tc-type') === 'image-banner'
  }
  return target.getAttributes?.()?.['data-tc-type'] === 'image-banner'
}

export function dropPointHitsImage(parentEl, clientX, clientY) {
  if (!parentEl || clientX == null || clientY == null) return false
  try {
    const doc = parentEl.ownerDocument
    const win = doc.defaultView
    const frame = win?.frameElement
    let x = clientX
    let y = clientY
    if (frame) {
      const fr = frame.getBoundingClientRect()
      x = clientX - fr.left
      y = clientY - fr.top
    }
    const stack = doc.elementsFromPoint?.(x, y) || []
    return stack.some((n) => n?.tagName === 'IMG' && parentEl.contains(n))
  } catch (_) {
    return false
  }
}

export function parentHasImageSibling(component) {
  const comp = getComp(component)
  if (!comp) return false
  const parent = comp.parent?.()
  if (!parent) return false
  if (isImageComponent(parent)) return true
  const pTc = parent.getAttributes?.()?.['data-tc-type']
  if (pTc === 'image-banner' || pTc === 'image') return true
  const kids = parent.components?.()
  if (!kids?.length) return false
  for (let i = 0; i < kids.length; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (child && child !== comp && isImageComponent(child)) return true
  }
  return false
}

export function isOverImageContext(component) {
  const comp = getComp(component)
  if (!comp) return false
  const parent = comp.parent?.()
  if (!parent) return false

  if (isImageComponent(parent)) return true
  const pTc = parent.getAttributes?.()?.['data-tc-type']
  if (pTc === 'image-banner' || pTc === 'image') return true

  const attrs = comp.getAttributes?.() || {}
  const style = comp.getStyle?.() || {}
  const isAbs =
    attrs['data-tc-absolute'] === '1' ||
    attrs['data-tc-absolute'] === 'true' ||
    String(style.position || '').toLowerCase() === 'absolute'

  if (!isAbs) return false
  return parentHasImageSibling(comp)
}

export function ensureParentRelative(component) {
  const parent = component.parent?.()
  if (!parent) return
  const pStyle = parent.getStyle?.() || {}
  if (!['absolute', 'relative', 'fixed'].includes(String(pStyle.position || ''))) {
    parent.addStyle({ position: 'relative' })
  }
  const kids = parent.components?.()
  if (!kids?.length) return
  for (let i = 0; i < kids.length; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (child && isImageComponent(child)) {
      const cs = child.getStyle?.() || {}
      if (String(cs['z-index'] || '') !== String(Z_IMAGE)) {
        child.addStyle({ position: 'relative', 'z-index': String(Z_IMAGE) })
      }
    }
  }
}

export function markAsAbsoluteOverlay(component, extraStyle = {}) {
  const comp = getComp(component)
  if (!comp || isHotspotComponent(comp)) return

  const attrs = comp.getAttributes?.() || {}
  const already = attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true'
  const prev = comp.getStyle?.() || {}
  const hasExtra = extraStyle && Object.keys(extraStyle).length > 0

  if (already && !hasExtra) {
    ensureParentRelative(comp)
    if (String(prev['z-index'] || '') !== String(Z_OVERLAY)) {
      comp.addStyle({ 'z-index': String(Z_OVERLAY) })
    }
    return
  }

  comp.addAttributes({ 'data-tc-absolute': '1' })
  ensureParentRelative(comp)
  try {
    comp.set('draggable', true)
  } catch (_) {
    /* noop */
  }

  const patch = {
    position: 'absolute',
    'z-index': String(Z_OVERLAY),
    margin: '0',
    ...extraStyle,
  }

  if (!extraStyle.width) {
    const w = prev.width
    if (!w || w === '100%') patch.width = 'auto'
  }
  if (!extraStyle['max-width'] && !prev['max-width']) {
    patch['max-width'] = 'calc(100% - 16px)'
  }

  comp.addStyle(patch)
}

export function promoteOverlayIfNeeded(component) {
  const comp = getComp(component)
  if (!comp) return false
  const attrs = comp.getAttributes?.() || {}

  if (attrs['data-tc-type'] === 'hotspot') {
    ensureParentRelative(comp)
    return true
  }

  if (attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true') {
    markAsAbsoluteOverlay(comp)
    return true
  }

  const style = comp.getStyle?.() || {}
  const isAbs = String(style.position || '').toLowerCase() === 'absolute'
  if (!isAbs) return false

  if (parentHasImageSibling(comp) || isOverImageContext(comp)) {
    markAsAbsoluteOverlay(comp)
    return true
  }

  try {
    const el = component.getEl?.()
    if (!el || typeof document === 'undefined') return false
    const doc = el.ownerDocument
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return false
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const stack = doc.elementsFromPoint?.(cx, cy) || []
    const hitImg = stack.some(
      (n) => n !== el && !el.contains(n) && n.tagName === 'IMG'
    )
    if (hitImg) {
      markAsAbsoluteOverlay(component)
      return true
    }
  } catch (_) {
    /* noop */
  }

  const tag = (component.get?.('tagName') || '').toLowerCase()
  const tc = attrs['data-tc-type']
  if (tag === 'button' || tc === 'button' || (tag === 'a' && tc !== 'hotspot')) {
    const z = parseInt(String(style['z-index'] || ''), 10)
    if (!Number.isFinite(z) || z < Z_OVERLAY) {
      component.addStyle({ 'z-index': String(Z_OVERLAY) })
    }
    return true
  }

  return false
}
