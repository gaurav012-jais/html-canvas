import { getCanvasFrameEl } from './canvasFrameUtils'

let heightSyncTimer = null

/** Baseline floor so an empty/short page does not collapse the editor frame. */
export const DEFAULT_CANVAS_MIN_HEIGHT = 400

/** Per page+device high-water mark — delete/remove must not shrink the canvas. */
const canvasHeightFloorByKey = new Map()

export function getCanvasHeightFloorKey(editor) {
  let pageId = 'default'
  let device = 'Desktop'
  try {
    pageId = editor?.Pages?.getSelected?.()?.getId?.() || pageId
  } catch (_) {
    /* noop */
  }
  try {
    device = String(editor?.Devices?.getSelected?.()?.get?.('name') || device)
  } catch (_) {
    /* noop */
  }
  return `${pageId}::${device}`
}

/**
 * Pick a stable canvas height: grow with content, never shrink unless allowShrink.
 */
export function resolveStableCanvasHeight(naturalH, previousFloor = 0, opts = {}) {
  const { allowShrink = false } = opts
  const contentH = Math.max(Math.ceil(Number(naturalH) || 0), DEFAULT_CANVAS_MIN_HEIGHT)
  if (allowShrink) return contentH
  return Math.max(contentH, Math.ceil(Number(previousFloor) || 0))
}

export function resetCanvasHeightFloor(editor) {
  if (!editor) {
    canvasHeightFloorByKey.clear()
    return
  }
  canvasHeightFloorByKey.delete(getCanvasHeightFloorKey(editor))
}

export function getRealContentHeight(doc, wrapperEl) {
  if (!doc) return 0
  
  const prevWrapperMin = wrapperEl?.style?.minHeight
  const prevBodyMin = doc.body?.style?.minHeight
  if (wrapperEl) wrapperEl.style.minHeight = ''
  if (doc.body) doc.body.style.minHeight = ''

  let maxBottom = 0

  if (wrapperEl && wrapperEl.children && wrapperEl.children.length > 0) {
    const children = Array.from(wrapperEl.children)
    children.forEach((child) => {
      const top = child.offsetTop || 0
      const height = child.offsetHeight || child.scrollHeight || 0
      const bottom = top + height
      if (bottom > maxBottom) {
        maxBottom = bottom
      }
    })
  }

  if (maxBottom === 0 && doc.body && doc.body.children) {
    const bodyChildren = Array.from(doc.body.children)
    bodyChildren.forEach((child) => {
      if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.classList?.contains('gjs-css-rules')) return
      const top = child.offsetTop || 0
      const height = child.offsetHeight || child.scrollHeight || 0
      const bottom = top + height
      if (bottom > maxBottom) {
        maxBottom = bottom
      }
    })
  }

  if (wrapperEl && prevWrapperMin != null) wrapperEl.style.minHeight = prevWrapperMin
  if (doc.body && prevBodyMin != null) doc.body.style.minHeight = prevBodyMin

  return Math.max(maxBottom, 250)
}

/**
 * Standard canvas height sync.
 * Desktop: Fits container viewport when content fits, grows when extra elements overflow.
 */
export function syncCanvasFrameHeight(editor, _options = {}) {
  if (heightSyncTimer) clearTimeout(heightSyncTimer)
  heightSyncTimer = setTimeout(() => {
    heightSyncTimer = null
    requestAnimationFrame(() => {
      const frameEl = getCanvasFrameEl(editor)
      const doc = frameEl?.contentDocument
      if (!frameEl || !doc?.body) return

      const wrapperEl = doc.querySelector('[data-gjs-type="wrapper"]')

      frameEl.style.height = '100%'
      frameEl.style.minHeight = '100%'

      if (wrapperEl) {
        wrapperEl.style.minHeight = '100%'
        wrapperEl.style.background = '#ffffff'
      }
      doc.body.style.minHeight = '100%'
      doc.body.style.background = '#ffffff'
      if (doc.documentElement) {
        doc.documentElement.style.minHeight = '100%'
        doc.documentElement.style.background = '#ffffff'
      }

      const frameWrapper = frameEl.parentElement
      const cvCanvas = frameWrapper?.parentElement
      if (cvCanvas) {
        cvCanvas.style.height = '100%'
        cvCanvas.style.top = '0px'
      }
      if (frameWrapper) {
        frameWrapper.style.height = '100%'
        frameWrapper.style.top = '0px'
      }
    })
  }, 50)
}
