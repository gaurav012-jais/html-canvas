import { RESPONSIVE_STYLE_RULES, FLOW_HOST_CSS } from '../services/flowRuntimeCss'
import {
  applyTextSizeAlignment,
  configureFlowButtonResizable,
  healFlowButtonsInEditor,
  keepFlowButtonInFlow,
  isFlowLayoutButton,
  wasIntentionallyAbsolute,
  TEXT_SIZE_ALIGN_CANVAS_CSS,
} from '../utils/textSizeAlign'
import { OVERLAY_STACKING_CANVAS_CSS, freezeHotspotToPixels, markAsAbsoluteOverlay } from '../utils/overlayStacking'
import { attachInputRestrictions } from '../utils/inputRestrictions'

import { getCanvasFrameEl } from './canvas/canvasFrameUtils'
import { applyDeviceViewport, autoAlignCanvasComponents } from './canvas/canvasViewport'
import {
  DEFAULT_CANVAS_MIN_HEIGHT,
  getCanvasHeightFloorKey,
  resolveStableCanvasHeight,
  resetCanvasHeightFloor,
  syncCanvasFrameHeight,
} from './canvas/canvasHeightSync'
import { setCanvasZoom, getCanvasZoom } from './canvas/canvasZoom'

export {
  applyDeviceViewport,
  autoAlignCanvasComponents,
  DEFAULT_CANVAS_MIN_HEIGHT,
  getCanvasHeightFloorKey,
  resolveStableCanvasHeight,
  resetCanvasHeightFloor,
  syncCanvasFrameHeight,
  setCanvasZoom,
  getCanvasZoom,
}

export function setupCanvasEnhancements(editor, onEmptyChange) {
  let alive = true
  let emptyNotifierTimer = null

  const checkEmpty = () => {
    if (!alive) return
    if (emptyNotifierTimer) clearTimeout(emptyNotifierTimer)
    emptyNotifierTimer = setTimeout(() => {
      emptyNotifierTimer = null
      if (!alive) return
      const wrapper = editor.getWrapper()
      const count = wrapper?.components().length || 0
      onEmptyChange?.(count === 0)
    }, 0)
  }

  editor.on('load', checkEmpty)
  editor.on('component:add', checkEmpty)
  editor.on('component:remove', checkEmpty)
  editor.on('page:select', checkEmpty)
  editor.on('canvas:frame:load', checkEmpty)

  const injectCanvasStyles = (frameWin) => {
    if (!frameWin) return
    const doc = frameWin.document
    let canvasStyles = doc.getElementById('tc-canvas-styles')
    if (!canvasStyles) {
      canvasStyles = doc.createElement('style')
      canvasStyles.id = 'tc-canvas-styles'
      doc.head.appendChild(canvasStyles)
    }
    canvasStyles.textContent = `
        html, body { scroll-behavior: smooth !important; height: 100% !important; min-height: 100% !important; background: #ffffff !important; margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #ffffff !important; box-sizing: border-box; }
        [data-gjs-type="wrapper"] {
          min-height: 100% !important;
          height: 100% !important;
          background: #ffffff !important;
          box-sizing: border-box;
          position: relative;
        }
        *:hover { outline: 1px dashed rgba(79, 70, 229, 0.35); outline-offset: 2px; }
        .gjs-selected { outline: 2px solid #2563eb !important; outline-offset: 2px; }
        ${FLOW_HOST_CSS}
        ${TEXT_SIZE_ALIGN_CANVAS_CSS}
        ${OVERLAY_STACKING_CANVAS_CSS}
        ${RESPONSIVE_STYLE_RULES}
      `
  }

  const bindFrameRestrictions = (frameWin) => {
    try {
      const doc = frameWin?.document || frameWin?.contentDocument
      if (doc) attachInputRestrictions(doc)
    } catch (_) {
      /* noop */
    }
  }

  editor.on('canvas:frame:load', ({ window: frameWin }) => {
    injectCanvasStyles(frameWin)
    bindFrameRestrictions(frameWin)

    const currentDevice = editor.Devices.getSelected()
    const afterLoad = () => {
      if (!alive) return
      const frame = editor.Canvas.getFrameEl?.()
      if (frame?.contentWindow) {
        injectCanvasStyles(frame.contentWindow)
        bindFrameRestrictions(frame.contentWindow)
      }
      const devName = currentDevice ? String(currentDevice.get('name')) : 'Desktop'
      applyDeviceViewport(editor, devName)
      syncCanvasFrameHeight(editor)
    }
    setTimeout(afterLoad, 60)
    setTimeout(afterLoad, 350)
  })

  try {
    const existing = editor.Canvas.getFrameEl?.()
    if (existing?.contentWindow) {
      injectCanvasStyles(existing.contentWindow)
      bindFrameRestrictions(existing.contentWindow)
    }
  } catch (_) {
    /* noop */
  }

  const isLiveDrag = () => {
    try {
      if (typeof document !== 'undefined' && document.body.classList.contains('tc-is-dragging')) {
        return true
      }
      if (editor.Commands?.isActive?.('core:component-drag')) return true
      if (editor.Commands?.isActive?.('core:component-resize')) return true
    } catch (_) {
      /* noop */
    }
    return false
  }

  const syncHeightIfIdle = () => {
    if (isLiveDrag()) return
    syncCanvasFrameHeight(editor, { allowShrink: true })
  }

  editor.on('component:add', syncHeightIfIdle)
  editor.on('component:remove', syncHeightIfIdle)
  editor.on('component:update', syncHeightIfIdle)

  const handleWindowResize = () => {
    if (!alive) return
    syncCanvasFrameHeight(editor, { allowShrink: true })
  }
  window.addEventListener('resize', handleWindowResize)

  editor.on('page:select', () => {
    resetCanvasHeightFloor(editor)
    setTimeout(() => {
      if (!alive) return
      const frame = editor.Canvas.getFrameEl?.()
      if (frame?.contentWindow) bindFrameRestrictions(frame.contentWindow)
      syncCanvasFrameHeight(editor, { allowShrink: true })
    }, 80)
  })

  editor.on('device:select', (device) => {
    if (!device) return
    const deviceName = String(device.get('name'))

    setTimeout(() => {
      if (!alive) return
      applyDeviceViewport(editor, deviceName)
      autoAlignCanvasComponents(editor, deviceName)
      syncCanvasFrameHeight(editor, { allowShrink: true })
      setTimeout(() => {
        try { editor.Canvas.refresh() } catch (_) { /* noop */ }
      }, 100)
    }, 50)
  })

  getCanvasFrameEl(editor)?.classList.add('tc-canvas-frame')

  let rafHandlesPending = false
  const refreshHandles = () => {
    if (rafHandlesPending) return
    rafHandlesPending = true
    requestAnimationFrame(() => {
      rafHandlesPending = false
      try { editor.Canvas.refresh() } catch (_) { /* noop */ }
    })
  }

  const attachScrollSync = () => {
    const frameEl = editor.Canvas?.getFrameEl?.()
    const frameWin = frameEl?.contentWindow
    if (frameWin) {
      frameWin.addEventListener('scroll', refreshHandles, { passive: true })
    }
  }

  editor.on('canvas:frame:load', attachScrollSync)
  editor.on('page:select', () => setTimeout(attachScrollSync, 100))
  setTimeout(attachScrollSync, 500)

  editor.on('component:drag:end', refreshHandles)
  editor.on('component:resize:end', refreshHandles)
  editor.on('undo', refreshHandles)
  editor.on('redo', refreshHandles)

  const resolveComponent = (payload) =>
    payload?.component ||
    (payload?.getStyle ? payload : null) ||
    editor.getSelected?.()

  let healingFlowButton = false

  const protectFlowButton = (payload) => {
    if (!alive || healingFlowButton) return
    const component = resolveComponent(payload)
    if (!component) return
    healingFlowButton = true
    try {
      if (wasIntentionallyAbsolute(component)) {
        configureFlowButtonResizable(component)
        return
      }
      if (!isFlowLayoutButton(component)) return
      keepFlowButtonInFlow(component)
      configureFlowButtonResizable(component)
    } catch (_) {
      /* noop */
    } finally {
      healingFlowButton = false
    }
  }

  const alignSizedText = (payload) => {
    if (!alive || healingFlowButton) return
    const component = resolveComponent(payload)
    if (!component) return
    try {
      if (isFlowLayoutButton(component) && !wasIntentionallyAbsolute(component)) {
        keepFlowButtonInFlow(component)
        return
      }
      applyTextSizeAlignment(component)
    } catch (_) {
      /* noop */
    }
  }

  editor.on('component:selected', (component) => {
    if (!alive || !component) return
    configureFlowButtonResizable(component)
    if (component.getAttributes?.()?.['data-tc-type'] === 'hotspot') {
      freezeHotspotToPixels(component)
    }
  })

  editor.on('component:resize:end', protectFlowButton)
  editor.on('component:resize:end', (component) => {
    if (!alive) return
    const cmp = resolveComponent(component)
    if (!cmp) return
    const tcType = cmp.getAttributes?.()?.['data-tc-type']
    if (tcType === 'hotspot') {
      try {
        const style = cmp.getStyle?.() || {}
        const w = String(style.width || '')
        const h = String(style.height || '')
        const stillFull = (w === '100%' || w === 'auto') && (h === '100%' || h === 'auto')
        if (!stillFull) {
          const attrs = { ...(cmp.getAttributes?.() || {}) }
          if (attrs['data-tc-cover-full']) {
            delete attrs['data-tc-cover-full']
            cmp.setAttributes(attrs)
            try {
              cmp.getEl?.()?.removeAttribute?.('data-tc-cover-full')
            } catch (_) {
              /* noop */
            }
          }
        }
        freezeHotspotToPixels(cmp)
      } catch (_) {
        /* noop */
      }
    } else {
      const style = cmp.getStyle?.() || {}
      const el = typeof cmp.getEl === 'function' ? cmp.getEl() : null
      const pos = String(style.position || el?.style?.position || '').toLowerCase()
      const hasTopLeft =
        (style.top != null && style.top !== '') ||
        (style.left != null && style.left !== '') ||
        (el?.style?.top && el.style.top !== '') ||
        (el?.style?.left && el.style.left !== '')
      if (pos === 'absolute' || hasTopLeft) {
        markAsAbsoluteOverlay(cmp)
      }
    }
  })

  editor.on('component:styleUpdate', (component) => {
    if (!component || healingFlowButton) return
    if (isLiveDrag()) return
    if (isFlowLayoutButton(component) && !wasIntentionallyAbsolute(component)) {
      protectFlowButton(component)
      return
    }
    const style = component.getStyle?.() || {}
    if (style.width || style.height || style['min-height']) alignSizedText(component)
  })

  editor.on('load', () => {
    setTimeout(() => {
      if (!alive || healingFlowButton) return
      healingFlowButton = true
      try {
        healFlowButtonsInEditor(editor)
      } finally {
        healingFlowButton = false
      }
    }, 100)
  })

  editor.on('canvas:frame:load', () => {
    setTimeout(() => {
      if (!alive || healingFlowButton) return
      healingFlowButton = true
      try {
        healFlowButtonsInEditor(editor)
      } finally {
        healingFlowButton = false
      }
    }, 120)
  })

  editor.on('page:select', () => {
    setTimeout(() => {
      if (!alive || healingFlowButton) return
      healingFlowButton = true
      try {
        healFlowButtonsInEditor(editor)
      } finally {
        healingFlowButton = false
      }
    }, 80)
  })

  return () => {
    alive = false
    window.removeEventListener('resize', handleWindowResize)
  }
}
