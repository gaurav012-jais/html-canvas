import {
  Z_HOTSPOT,
  IMAGE_BANNER_STYLE,
  HOTSPOT_RESIZABLE,
  applyBannerHostStyle,
  ensureImageLayout,
  coverFullBox,
  applyCoverFullToEl,
} from './stackingConstants'
import { isImageBannerHost, isImageComponent, isHotspotComponent } from './overlayDetection'
import {
  imageBoxReady,
  remapHotspotToAnchor,
  findHotspotImageEl,
} from './hotspotGeometry'

export function isImgLikeComponent(cmp) {
  if (!cmp || isImageBannerHost(cmp)) return false
  const tag = String(cmp.get?.('tagName') || '').toLowerCase()
  const tc = cmp.getAttributes?.()?.['data-tc-type']
  return tag === 'img' || tc === 'image'
}

export function findImageSiblingComponent(hotspotCmp) {
  const parent = hotspotCmp?.parent?.()
  const kids = parent?.components?.()
  if (!kids) return null
  const len = kids.length || 0
  for (let i = 0; i < len; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (child && child !== hotspotCmp && isImageComponent(child)) return child
  }
  return null
}

export function findImageComponentDeep(root, skip) {
  if (!root) return null
  if (root !== skip && isImgLikeComponent(root)) return root
  const kids = root.components?.()
  const len = kids?.length || 0
  for (let i = 0; i < len; i++) {
    const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
    if (!child || child === skip) continue
    const found = findImageComponentDeep(child, skip)
    if (found) return found
  }
  return null
}

export function wrapImageAsBanner(imgCmp) {
  if (!imgCmp) return null
  const parent = imgCmp.parent?.()
  if (!parent) return imgCmp
  if (isImageBannerHost(parent)) {
    parent.addStyle?.(IMAGE_BANNER_STYLE)
    return parent
  }
  const coll = parent.components?.()
  if (!coll?.add) return parent
  const idx = typeof imgCmp.index === 'function' ? imgCmp.index() : 0
  const added = coll.add(
    {
      tagName: 'div',
      attributes: { 'data-tc-type': 'image-banner' },
      style: { ...IMAGE_BANNER_STYLE },
    },
    { at: idx },
  )
  const host = Array.isArray(added) ? added[0] : added
  if (!host) return parent
  if (parent?.components) {
    try {
      parent.components().remove(imgCmp, { temporary: true })
    } catch (_) {
      try {
        parent.components().remove(imgCmp)
      } catch (_) {
        // ignore fallback remove
      }
    }
  }
  if (typeof host.append === 'function') host.append(imgCmp)
  else host.components?.()?.add?.(imgCmp)
  return host
}

export function syncHotspotElToModel(component, el) {
  if (!component?.addStyle || !el?.style) return
  const left = el.style.left
  const top = el.style.top
  const width = el.style.width
  const height = el.style.height
  if (!left && !top) return
  component.addStyle({
    position: 'absolute',
    left,
    top,
    width,
    height,
    display: 'block',
    'text-decoration': 'none',
    'z-index': String(Z_HOTSPOT),
    'pointer-events': 'auto',
    cursor: 'pointer',
  })
  try {
    component.removeStyle?.('right')
    component.removeStyle?.('bottom')
  } catch (_) {
    /* noop */
  }
}

export function pinEditorHotspotToImage(component) {
  if (!isHotspotComponent(component)) return
  const parent = component.parent?.()
  if (!parent) return
  const hotspotEl = component.getEl?.()

  if (isImageBannerHost(parent)) {
    parent.addStyle?.(IMAGE_BANNER_STYLE)
    const hostEl = parent.getEl?.()
    if (hostEl) applyBannerHostStyle(hostEl)
    ensureImageLayout(hostEl?.querySelector?.('img'))
    return
  }

  const img = findImageSiblingComponent(component) || findImageComponentDeep(parent, component)
  if (!img) return
  const imgEl =
    String(img.get?.('tagName') || '').toLowerCase() === 'img'
      ? img.getEl?.()
      : img.getEl?.()?.querySelector?.('img') || img.getEl?.()
  ensureImageLayout(imgEl)
  if (hotspotEl && imgEl && imageBoxReady(imgEl)) {
    remapHotspotToAnchor(hotspotEl, imgEl)
    syncHotspotElToModel(component, hotspotEl)
  }
  const host = wrapImageAsBanner(img)
  if (host) host.addStyle?.(IMAGE_BANNER_STYLE)
  const hostEl = host?.getEl?.()
  if (hostEl) applyBannerHostStyle(hostEl)
  if (!host || component.parent?.() === host) return
  if (parent?.components) {
    try {
      parent.components().remove(component, { temporary: true })
    } catch (_) {
      try {
        parent.components().remove(component)
      } catch (_) {
        // ignore fallback remove
      }
    }
  }
  if (typeof host.append === 'function') host.append(component)
  else host.components?.()?.add?.(component)
}

export function persistEditorHotspotBox(component) {
  if (!isHotspotComponent(component)) return
  const el = component.getEl?.()
  const parentEl = component.parent?.()?.getEl?.()
  if (!el || !parentEl) return
  const img = parentEl.querySelector?.('img')
  const anchor = img && imageBoxReady(img) ? img : parentEl
  if (!remapHotspotToAnchor(el, anchor)) return
  syncHotspotElToModel(component, el)
}

export function freezeHotspotToPixels(component) {
  if (!isHotspotComponent(component)) return
  try {
    component.set?.({
      resizable: HOTSPOT_RESIZABLE,
      draggable: true,
      locked: false,
    })
  } catch (_) {
    /* noop */
  }
  const cover =
    component.getAttributes?.()?.['data-tc-cover-full'] === '1' ||
    component.getAttributes?.()?.['data-tc-cover-full'] === 'true'
  if (cover) {
    coverHotspotFullImage(component)
    return
  }
  const el = component.getEl?.()
  const parentEl = component.parent?.()?.getEl?.()
  if (!el || !parentEl) return
  const img = parentEl.querySelector?.('img')
  const anchor = img || parentEl
  const ar = anchor.getBoundingClientRect?.()
  const er = el.getBoundingClientRect?.()
  if (!ar || !er || ar.width < 8 || ar.height < 8) return
  const left = Math.round(er.left - ar.left)
  const top = Math.round(er.top - ar.top)
  const width = Math.max(10, Math.round(er.width))
  const height = Math.max(10, Math.round(er.height))
  el.style.position = 'absolute'
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.width = `${width}px`
  el.style.height = `${height}px`
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  el.style.minHeight = '0px'
  el.style.minWidth = '0px'
  syncHotspotElToModel(component, el)
}

export function coverHotspotFullImage(component) {
  if (!isHotspotComponent(component)) return
  try {
    pinEditorHotspotToImage(component)
  } catch (_) {
    /* noop */
  }
  try {
    const attrs = { ...(component.getAttributes?.() || {}), 'data-tc-cover-full': '1' }
    component.setAttributes?.(attrs)
  } catch (_) {
    /* noop */
  }

  const parent = component.parent?.()
  const parentEl = parent?.getEl?.()
  const img = parentEl?.querySelector?.('img') || findHotspotImageEl(component.getEl?.())
  if (parent) parent.addStyle?.(IMAGE_BANNER_STYLE)
  if (parentEl) applyBannerHostStyle(parentEl)
  ensureImageLayout(img)

  const box = coverFullBox()
  try {
    component.addStyle?.(box)
  } catch (_) {
    /* noop */
  }

  const el = component.getEl?.()
  applyCoverFullToEl(el)

  if (img && img.tagName === 'IMG' && img.complete === false) {
    img.addEventListener('load', () => coverHotspotFullImage(component), { once: true })
  }
}
