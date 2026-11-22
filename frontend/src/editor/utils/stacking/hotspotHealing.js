import {
  Z_HOTSPOT,
  HOTSPOT_RESIZABLE,
  defaultHotspotBox,
  hrefIsNavigationTarget,
} from './stackingConstants'
import { isHotspotComponent, isImageBannerHost } from './overlayDetection'
import {
  pinEditorHotspotToImage,
  freezeHotspotToPixels,
  syncHotspotElToModel,
  normalizeHotspotBox,
  pinLiveHotspotToImage,
} from './hotspotGeometry'

export function clearHotspotGeometryRules(component, editor, el) {
  const classNames = Array.from(el?.classList || []).filter((c) => !String(c).startsWith('gjs-'))
  if (!classNames.length) return
  try {
    const rules = editor?.CssComposer?.getAll?.()
    rules?.forEach?.((rule) => {
      const sel = rule.getSelectors?.()?.getFullString?.() || ''
      if (!classNames.some((c) => sel === `.${c}`)) return
      const st = rule.getStyle?.() || {}
      const next = { ...st }
      let changed = false
      for (const key of ['top', 'left', 'right', 'bottom', 'width', 'height', 'cursor']) {
        if (key in next) {
          delete next[key]
          changed = true
        }
      }
      if (changed) rule.setStyle(next)
    })
  } catch (_) {
    /* noop */
  }
}

export function hasPercentGeometry(el) {
  const l = String(el.style?.left || '')
  const t = String(el.style?.top || '')
  const w = String(el.style?.width || '')
  const h = String(el.style?.height || '')
  return l.endsWith('%') && t.endsWith('%') && w.endsWith('%') && h.endsWith('%')
}

export function applyHotspotChrome(el) {
  el.style.position = 'absolute'
  el.style.display = 'block'
  el.style.textDecoration = 'none'
  el.style.zIndex = String(Z_HOTSPOT)
  el.style.pointerEvents = 'auto'
  el.style.cursor = 'pointer'
}

/**
 * Repair hotspots after load / bad saves / drag-end:
 * - Ensure data-action so preview clicks fire the flow
 * - Keep HTML5 draggable=true
 * - Convert px geometry → % so preview stays aligned
 * - Strip cursor:move leftovers from absolute drag
 */
export function healEditorHotspot(component, editor, { geometry = 'percent' } = {}) {
  if (!isHotspotComponent(component)) return

  const attrs = { ...(component.getAttributes?.() || {}) }
  let attrsChanged = false
  if (attrs['data-tc-absolute']) {
    delete attrs['data-tc-absolute']
    attrsChanged = true
  }

  const href = String(attrs.href || '').trim()
  const hasNav = hrefIsNavigationTarget(href)

  if (
    attrs['data-action'] === 'SUBSCRIBE' &&
    hasNav &&
    !attrs['data-actions']
  ) {
    delete attrs['data-action']
    attrsChanged = true
  } else if (!attrs['data-action'] && !attrs['data-actions'] && !hasNav) {
    attrs['data-action'] = 'SUBSCRIBE'
    attrsChanged = true
  }

  if (!attrs.href) {
    attrs.href = '#'
    attrsChanged = true
  }
  if (attrsChanged) {
    try {
      component.setAttributes(attrs)
    } catch (_) {
      /* noop */
    }
  }

  try {
    component.set({
      type: 'hotspot',
      draggable: true,
      selectable: true,
      hoverable: true,
      highlightable: true,
      locked: false,
      resizable: HOTSPOT_RESIZABLE,
    })
  } catch (_) {
    /* noop */
  }

  try {
    pinEditorHotspotToImage(component)
  } catch (_) {
    /* noop */
  }

  const el = component.getEl?.()
  if (el) {
    el.setAttribute('draggable', 'true')
  }

  const parent = component.parent?.()
  const parentEl = parent?.getEl?.()
  if (parentEl) {
    const pStyle = parent.getStyle?.() || {}
    if (!['absolute', 'relative', 'fixed'].includes(String(pStyle.position || ''))) {
      parent.addStyle?.({ position: 'relative' })
    }
  }

  if (!el || !parentEl) {
    const style = component.getStyle?.() || {}
    const patch = {
      position: 'absolute',
      display: 'block',
      'text-decoration': 'none',
      'z-index': String(Z_HOTSPOT),
      'pointer-events': 'auto',
      cursor: 'pointer',
    }
    if (!style.top && !style.left) Object.assign(patch, defaultHotspotBox(false))
    component.addStyle(patch)
    return
  }

  const coverFull =
    attrs['data-tc-cover-full'] === '1' || attrs['data-tc-cover-full'] === 'true'

  if (geometry === 'pixels') {
    freezeHotspotToPixels(component)
    return
  }

  const modelStyle = component.getStyle?.() || {}
  for (const key of ['left', 'top', 'width', 'height']) {
    if (!el.style[key] && modelStyle[key]) {
      el.style[key] = String(modelStyle[key])
    }
  }

  if (!coverFull && hasPercentGeometry(el) && isImageBannerHost(parent)) {
    syncHotspotElToModel(component, el)
    component.addStyle({
      position: 'absolute',
      display: 'block',
      'text-decoration': 'none',
      'z-index': String(Z_HOTSPOT),
      'pointer-events': 'auto',
      cursor: 'pointer',
    })
    return
  }

  const box = normalizeHotspotBox(el, parentEl, { coverFull })
  if (!box) return

  clearHotspotGeometryRules(component, editor, el)

  try {
    component.removeStyle?.('right')
    component.removeStyle?.('bottom')
    component.removeStyle?.('margin')
    component.removeStyle?.('margin-top')
    component.removeStyle?.('margin-left')
  } catch (_) {
    /* noop */
  }

  if (coverFull) {
    component.setStyle(box)
  } else {
    const { right: _r, bottom: _b, ...rest } = box
    component.setStyle(rest)
    try {
      component.removeStyle?.('right')
      component.removeStyle?.('bottom')
    } catch (_) {
      /* noop */
    }
  }

  if (el?.style && box) {
    el.style.position = 'absolute'
    el.style.left = box.left
    el.style.top = box.top
    el.style.width = box.width
    el.style.height = box.height
    el.style.right = coverFull ? '0%' : ''
    el.style.bottom = coverFull ? '0%' : ''
  }
}

/** Live funnel: make hotspots clickable + convert px → % once. */
export function healLiveHotspots(root, pageType) {
  if (!root?.querySelectorAll) return
  const page = String(pageType || '').toUpperCase()
  const defaultAction =
    page === 'CONFIRM' ? 'CONFIRM' : page === 'HOME' ? 'SUBSCRIBE' : null

  root.querySelectorAll('[data-tc-type="hotspot"]').forEach((el) => {
    try {
      const href = (el.getAttribute('href') || '').trim()
      const hasNav = hrefIsNavigationTarget(href)

      if (
        el.getAttribute('data-action') === 'SUBSCRIBE' &&
        hasNav &&
        !el.hasAttribute('data-actions')
      ) {
        el.removeAttribute('data-action')
      } else if (
        !el.getAttribute('data-action') &&
        !el.hasAttribute('data-actions') &&
        defaultAction &&
        !hasNav
      ) {
        el.setAttribute('data-action', defaultAction)
      }
      if (!el.getAttribute('href')) el.setAttribute('href', '#')
      el.removeAttribute('draggable')

      pinLiveHotspotToImage(el)

      const parent = el.parentElement
      if (!parent) return
      const cs = parent.ownerDocument?.defaultView?.getComputedStyle?.(parent)
      if (cs && cs.position === 'static') {
        parent.style.position = 'relative'
      }

      const coverFull =
        el.getAttribute('data-tc-cover-full') === '1' ||
        el.getAttribute('data-tc-cover-full') === 'true'

      if (!coverFull && isImageBannerHost(parent) && hasPercentGeometry(el)) {
        applyHotspotChrome(el)
        el.style.right = ''
        el.style.bottom = ''
        return
      }

      if (!coverFull && !isImageBannerHost(parent)) {
        applyHotspotChrome(el)
        return
      }

      const box = normalizeHotspotBox(el, parent, { coverFull })
      if (!box) {
        applyHotspotChrome(el)
        return
      }

      applyHotspotChrome(el)
      el.style.top = box.top
      el.style.left = box.left
      el.style.width = box.width
      el.style.height = box.height
      if (coverFull) {
        el.style.right = '0'
        el.style.bottom = '0'
      } else {
        el.style.right = ''
        el.style.bottom = ''
      }
    } catch (_) {
      /* noop */
    }
  })
}
