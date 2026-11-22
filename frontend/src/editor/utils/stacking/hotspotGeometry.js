import {
  fitBoxPct,
  pct,
  defaultHotspotBox,
  hotspotChrome,
  styleToPct,
  applyBannerHostStyle,
} from './stackingConstants'
import { isImageBannerHost } from './overlayDetection'

export {
  isImgLikeComponent,
  findImageSiblingComponent,
  findImageComponentDeep,
  wrapImageAsBanner,
  syncHotspotElToModel,
  pinEditorHotspotToImage,
  persistEditorHotspotBox,
  freezeHotspotToPixels,
  coverHotspotFullImage,
} from './hotspotGrapesjs'

export function directChildImageEl(parentEl) {
  if (!parentEl?.children) return null
  for (const child of parentEl.children) {
    if (child?.tagName === 'IMG') return child
  }
  return null
}

export function imageBoxReady(img) {
  if (!img) return false
  const r = img.getBoundingClientRect?.()
  if (!r || r.width < 8 || r.height < 8) return false
  if (img.tagName === 'IMG' && img.complete === false) return false
  if (img.tagName === 'IMG' && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const expectedH = r.width * (img.naturalHeight / img.naturalWidth)
    if (expectedH > 8 && Math.abs(r.height - expectedH) > Math.max(12, expectedH * 0.2)) {
      return false
    }
  }
  return true
}

/** Rewrite hotspot geometry so % is relative to the image box, not a taller parent. */
export function remapHotspotToAnchor(hotspotEl, anchorEl) {
  if (!hotspotEl || !anchorEl) return false
  const er = hotspotEl.getBoundingClientRect?.()
  const ar = anchorEl.getBoundingClientRect?.()
  if (!er || !ar || ar.width < 8 || ar.height < 8 || er.width < 4 || er.height < 4) {
    return false
  }
  let left = ((er.left - ar.left) / ar.width) * 100
  let top = ((er.top - ar.top) / ar.height) * 100
  let width = (er.width / ar.width) * 100
  let height = (er.height / ar.height) * 100
  ;({ left, top, width, height } = fitBoxPct(left, top, width, height))
  hotspotEl.style.position = 'absolute'
  hotspotEl.style.left = `${left.toFixed(2)}%`
  hotspotEl.style.top = `${top.toFixed(2)}%`
  hotspotEl.style.width = `${width.toFixed(2)}%`
  hotspotEl.style.height = `${height.toFixed(2)}%`
  hotspotEl.style.right = ''
  hotspotEl.style.bottom = ''
  return true
}

export function findHotspotImageEl(hotspotEl) {
  const parent = hotspotEl?.parentElement
  if (!parent) return null
  const direct = directChildImageEl(parent)
  if (direct) return direct
  let sib = hotspotEl.previousElementSibling
  while (sib) {
    if (sib.tagName === 'IMG') return sib
    const inner = sib.querySelector?.('img')
    if (inner) return inner
    sib = sib.previousElementSibling
  }
  sib = hotspotEl.nextElementSibling
  while (sib) {
    if (sib.tagName === 'IMG') return sib
    const inner = sib.querySelector?.('img')
    if (inner) return inner
    sib = sib.nextElementSibling
  }
  return parent.querySelector?.('img')
}

/** Live DOM: wrap image + hotspot so the hotspot stays glued on resize. */
export function pinLiveHotspotToImage(hotspotEl) {
  if (!hotspotEl?.parentElement) return hotspotEl.parentElement
  const parent = hotspotEl.parentElement
  if (isImageBannerHost(parent)) {
    applyBannerHostStyle(parent)
    if (hotspotEl.getAttribute('data-tc-pinned') === '1') return parent
    const img = parent.querySelector?.('img')
    if (img && imageBoxReady(img) && remapHotspotToAnchor(hotspotEl, img)) {
      hotspotEl.setAttribute('data-tc-pinned', '1')
    }
    return parent
  }

  const siblingBanner = Array.from(parent.children).find(
    (n) => n !== hotspotEl && isImageBannerHost(n),
  )
  if (siblingBanner) {
    const img = siblingBanner.querySelector('img') || siblingBanner
    if (!imageBoxReady(img)) return parent
    remapHotspotToAnchor(hotspotEl, img)
    siblingBanner.appendChild(hotspotEl)
    applyBannerHostStyle(siblingBanner)
    hotspotEl.setAttribute('data-tc-pinned', '1')
    return siblingBanner
  }

  const img = findHotspotImageEl(hotspotEl)
  if (!img) return parent

  const imgBanner = img.closest?.('[data-tc-type="image-banner"]')
  if (imgBanner && imgBanner !== hotspotEl) {
    remapHotspotToAnchor(hotspotEl, img)
    imgBanner.appendChild(hotspotEl)
    applyBannerHostStyle(imgBanner)
    hotspotEl.setAttribute('data-tc-pinned', '1')
    return imgBanner
  }

  if (!imageBoxReady(img)) return parent

  remapHotspotToAnchor(hotspotEl, img)

  const wrap = parent.ownerDocument.createElement('div')
  wrap.setAttribute('data-tc-type', 'image-banner')
  applyBannerHostStyle(wrap)
  const imgParent = img.parentElement || parent
  imgParent.insertBefore(wrap, img)
  wrap.appendChild(img)
  wrap.appendChild(hotspotEl)
  hotspotEl.setAttribute('data-tc-pinned', '1')
  return wrap
}

/** Scale image+hotspots together after pin, so the CTA stays in view without moving the hotspot %. */
export function fitCreativeToViewport(root) {
  if (!root?.querySelectorAll) return
  const win = root.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null)
  if (!win) return
  const maxH = Math.max(160, Math.round((win.visualViewport?.height || win.innerHeight || 800) - 4))
  const banners = root.querySelectorAll('[data-tc-type="image-banner"]')
  banners.forEach((el) => {
    el.style.transform = 'none'
    el.style.marginBottom = ''
    const h = el.scrollHeight || el.offsetHeight || 0
    if (h <= maxH + 8) return
    const scale = maxH / h
    el.style.transformOrigin = 'top center'
    el.style.transform = `scale(${scale})`
    el.style.marginBottom = `${Math.round(-h * (1 - scale))}px`
  })
}

export function normalizeHotspotBox(el, parentEl, { coverFull = false } = {}) {
  if (!el || !parentEl) return null

  const rect = parentEl.getBoundingClientRect?.() || { width: 0, height: 0 }
  const pw = Math.max(parentEl.clientWidth || 0, parentEl.offsetWidth || 0, rect.width || 0)
  const ph = Math.max(parentEl.clientHeight || 0, parentEl.offsetHeight || 0, rect.height || 0)
  if (pw < 40 || ph < 40) return null

  if (coverFull) {
    return hotspotChrome({
      top: '0%',
      left: '0%',
      width: '100%',
      height: '100%',
      right: '0%',
      bottom: '0%',
    })
  }

  let leftPct = String(el.style?.left || '').endsWith('%') ? parseFloat(el.style.left) : null
  let topPct = String(el.style?.top || '').endsWith('%') ? parseFloat(el.style.top) : null
  let widthPct = String(el.style?.width || '').endsWith('%') ? parseFloat(el.style.width) : null
  let heightPct = String(el.style?.height || '').endsWith('%') ? parseFloat(el.style.height) : null

  const pr = parentEl.getBoundingClientRect?.() || { width: 0, height: 0, left: 0, top: 0 }
  const er = el.getBoundingClientRect?.() || { width: 0, height: 0, left: 0, top: 0 }
  const hasRect = pr.width > 0 && pr.height > 0 && er.width > 2 && er.height > 2

  if (hasRect) {
    if (leftPct == null || !Number.isFinite(leftPct)) {
      leftPct = ((er.left - pr.left) / pr.width) * 100
    }
    if (topPct == null || !Number.isFinite(topPct)) {
      topPct = ((er.top - pr.top) / pr.height) * 100
    }
    if (widthPct == null || !Number.isFinite(widthPct)) {
      widthPct = (er.width / pr.width) * 100
    }
    if (heightPct == null || !Number.isFinite(heightPct)) {
      heightPct = (er.height / pr.height) * 100
    }
  } else {
    leftPct = leftPct ?? styleToPct(el.style?.left, pw)
    topPct = topPct ?? styleToPct(el.style?.top, ph)
    widthPct = widthPct ?? styleToPct(el.style?.width, pw)
    heightPct = heightPct ?? styleToPct(el.style?.height, ph)
  }

  if (leftPct == null || topPct == null || widthPct == null || heightPct == null) {
    if (!hasRect && leftPct == null && topPct == null && widthPct == null && heightPct == null) {
      return hotspotChrome({ ...defaultHotspotBox(false) })
    }
    leftPct = leftPct ?? 25
    topPct = topPct ?? 40
    widthPct = widthPct ?? 50
    heightPct = heightPct ?? 14
  }

  ;({ left: leftPct, top: topPct, width: widthPct, height: heightPct } = fitBoxPct(
    leftPct,
    topPct,
    widthPct,
    heightPct,
  ))

  return hotspotChrome({
    top: pct(topPct),
    left: pct(leftPct),
    width: pct(widthPct, 30),
    height: pct(heightPct, 12),
  })
}
