import {
  markAsAbsoluteOverlay,
  promoteOverlayIfNeeded,
  dropPointHitsImage,
  isImageComponent,
  healEditorHotspot,
  HOTSPOT_RESIZABLE,
  freezeHotspotToPixels,
} from '../../utils/overlayStacking'
import {
  configureFlowButtonResizable,
  configureBlockResizable,
  isFlowLayoutButton,
  keepFlowButtonInFlow,
  isButtonLikeComponent,
} from '../../utils/textSizeAlign'
import { autoSuggestAnchorOnUpdate } from './canvasAnchorDetection'
import { getComp } from '../../utils/editorUtils'

export function setupCanvasDropPositioning(ed, getIsMounted, refreshSelection) {
  let lastDragEvent = null
  let isDraggingBlock = false

  const handleDragMove = (e) => {
    if (!isDraggingBlock) return
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    if (clientX != null && clientY != null) {
      lastDragEvent = { clientX, clientY }
    }
  }

  const attachFrameDragListeners = () => {
    try {
      const frameEl = ed.Canvas?.getFrameEl?.()
      const frameDoc = frameEl?.contentDocument
      if (!frameDoc || frameDoc.__tcDragTrackAttached) return
      frameDoc.__tcDragTrackAttached = true

      const onFrameMove = (e) => {
        if (!isDraggingBlock) return
        const fr = frameEl.getBoundingClientRect()
        const zoom = (ed.Canvas?.getZoom?.() || 100) / 100
        lastDragEvent = {
          clientX: fr.left + e.clientX * zoom,
          clientY: fr.top + e.clientY * zoom,
        }
      }
      frameDoc.addEventListener('mousemove', onFrameMove, true)
      frameDoc.addEventListener('pointermove', onFrameMove, true)
    } catch (_) {
      /* noop */
    }
  }

  const onDragStart = () => {
    isDraggingBlock = true
    attachFrameDragListeners()
    window.addEventListener('mousemove', handleDragMove, true)
    window.addEventListener('pointermove', handleDragMove, true)
  }

  const onDragStop = () => {
    isDraggingBlock = false
    window.removeEventListener('mousemove', handleDragMove, true)
    window.removeEventListener('pointermove', handleDragMove, true)
  }

  const onCanvasDragOver = (e) => {
    if (e && e.clientX !== undefined) lastDragEvent = e
  }

  const onComponentAdd = (component) => {
    setTimeout(() => {
      if (!getIsMounted()) return

      const type = component.get('type')
      const tag = (component.get('tagName') || '').toLowerCase()
      const isWrapperOrSection =
        type === 'wrapper' ||
        tag === 'body' ||
        ['section', 'header', 'footer', 'main'].includes(tag) ||
        component.getAttributes()?.['data-tc-type'] === 'section'

      if (isWrapperOrSection) return

      const isButton = isButtonLikeComponent(component) || isFlowLayoutButton(component)
      const parent = component.parent()

      if (parent && isDraggingBlock && lastDragEvent && lastDragEvent.clientX !== undefined) {
        const parentEl = parent.getEl ? parent.getEl() : null
        const frameEl = ed.Canvas?.getFrameEl?.()
        const frameDoc = frameEl?.contentDocument
        const frameRect = frameEl ? frameEl.getBoundingClientRect() : null
        const zoom = (ed.Canvas?.getZoom?.() || 100) / 100

        let iframeX = lastDragEvent.clientX
        let iframeY = lastDragEvent.clientY
        if (frameRect) {
          iframeX = (lastDragEvent.clientX - frameRect.left) / zoom
          iframeY = (lastDragEvent.clientY - frameRect.top) / zoom
        }

        let droppedOnImage = false
        if (frameDoc && frameDoc.elementsFromPoint) {
          const hitElements = frameDoc.elementsFromPoint(iframeX, iframeY) || []
          droppedOnImage = hitElements.some(
            (el) =>
              el.tagName === 'IMG' ||
              el.getAttribute?.('data-tc-type') === 'image-banner' ||
              el.closest?.('[data-tc-type="image-banner"]')
          )
        }
        if (!droppedOnImage && parentEl) {
          droppedOnImage = dropPointHitsImage(
            parentEl,
            lastDragEvent.clientX,
            lastDragEvent.clientY
          )
        }

        if (parentEl && (droppedOnImage || isImageComponent(parent))) {
          const rect = parentEl.getBoundingClientRect()
          const topPct = Math.max(
            0,
            Math.min(95, ((lastDragEvent.clientY - rect.top) / rect.height) * 100)
          )
          const leftPct = Math.max(
            0,
            Math.min(95, ((lastDragEvent.clientX - rect.left) / rect.width) * 100)
          )

          markAsAbsoluteOverlay(component, {
            top: `${topPct.toFixed(2)}%`,
            left: `${leftPct.toFixed(2)}%`,
            'z-index': '40',
          })
        } else if (parent && parent.components) {
          // Target insertion at closest child Y position within the container
          const kids = parent.components().models || []
          if (kids.length > 1) {
            let closestChild = null
            let minDiff = Infinity
            let insertAfter = true

            kids.forEach((childCmp) => {
              if (childCmp === component) return
              const childEl = childCmp.getEl ? childCmp.getEl() : null
              if (!childEl || typeof childEl.getBoundingClientRect !== 'function') return
              const cRect = childEl.getBoundingClientRect()
              const childMidY = cRect.top + cRect.height / 2
              const diff = Math.abs(iframeY - childMidY)
              if (diff < minDiff) {
                minDiff = diff
                closestChild = childCmp
                insertAfter = iframeY >= childMidY
              }
            })

            if (closestChild && typeof closestChild.index === 'function') {
              const targetIdx = closestChild.index() + (insertAfter ? 1 : 0)
              const currentIdx = component.index()
              if (targetIdx !== currentIdx && targetIdx >= 0) {
                parent.components().remove(component, { temporary: true })
                parent
                  .components()
                  .add(component, { at: Math.min(targetIdx, parent.components().length) })
              }
            }
          }
        }
      } else if (parent && isImageComponent(parent)) {
        // Click-add into an image/banner wrapper -> overlay with z-index 40
        markAsAbsoluteOverlay(component, { top: '40%', left: '25%', 'z-index': '40' })
      }

      // Ensure non-overlay components near images have z-index 10 so they don't fall behind z-index 1 images
      const currentStyle = component.getStyle() || {}
      if (!currentStyle['z-index'] && currentStyle.position !== 'absolute') {
        const pTc = parent?.getAttributes?.()?.['data-tc-type']
        if (pTc === 'image-banner' || isImageComponent(parent)) {
          component.addStyle({ position: 'relative', 'z-index': '10' })
        }
      }

      // In-card funnel CTAs stay in flow; overlays on images do not
      const isOverlay =
        component.getAttributes()?.['data-tc-absolute'] === '1' ||
        component.getAttributes()?.['data-tc-type'] === 'hotspot'
      if (isFlowLayoutButton(component) && !isOverlay) {
        keepFlowButtonInFlow(component)
        configureFlowButtonResizable(component)
      } else if (isButton && isOverlay) {
        configureFlowButtonResizable(component)
      } else if (isButton || isImageComponent(component)) {
        component.set('resizable', true)
      } else if (component.getAttributes()?.['data-tc-type'] === 'hotspot') {
        component.set('resizable', HOTSPOT_RESIZABLE)
        freezeHotspotToPixels(component)
      } else {
        configureBlockResizable(component)
      }
    }, 50)
  }

  const onDragEnd = (componentArg) => {
    if (!getIsMounted() || !componentArg) return
    const component = getComp(componentArg)
    if (!component) return
    if (component.getAttributes?.()?.['data-tc-type'] === 'hotspot') {
      healEditorHotspot(component, ed, { geometry: 'pixels' })
      promoteOverlayIfNeeded(component)
      return
    }
    const style = component.getStyle?.() || {}
    const el = typeof component.getEl === 'function' ? component.getEl() : null
    const pos = String(style.position || el?.style?.position || '').toLowerCase()
    const hasTopLeft =
      (style.top != null && style.top !== '') ||
      (style.left != null && style.left !== '') ||
      (el?.style?.top && el.style.top !== '') ||
      (el?.style?.left && el.style.left !== '')

    if (pos === 'absolute' || pos === 'fixed' || hasTopLeft) {
      markAsAbsoluteOverlay(component)
    }
    if (isButtonLikeComponent(component) || isFlowLayoutButton(component)) {
      promoteOverlayIfNeeded(component)
      configureFlowButtonResizable(component)
    } else {
      promoteOverlayIfNeeded(component)
    }
  }

  const onSelected = (component) => {
    if (!getIsMounted() || !component) return
    if (isButtonLikeComponent(component) || isFlowLayoutButton(component)) {
      const style = component.getStyle?.() || {}
      if (String(style.position || '').toLowerCase() === 'absolute') {
        promoteOverlayIfNeeded(component)
      }
      configureFlowButtonResizable(component)
      return
    }
    const before = component.get('resizable')
    configureBlockResizable(component)
    if (!before && component.get('resizable')) {
      setTimeout(() => {
        try {
          ed.Canvas?.refresh?.()
        } catch (_) {
          /* noop */
        }
      }, 0)
    }
  }

  const onComponentUpdate = (component) => {
    if (!getIsMounted()) return
    autoSuggestAnchorOnUpdate(ed, component, refreshSelection)
  }

  ed.on('block:drag:start', onDragStart)
  ed.on('block:drag:stop', onDragStop)
  ed.on('canvas:dragover', onCanvasDragOver)
  ed.on('component:add', onComponentAdd)
  ed.on('component:drag:end', onDragEnd)
  ed.on('component:selected', onSelected)
  ed.on('component:update', onComponentUpdate)

  return () => {
    window.removeEventListener('mousemove', handleDragMove, true)
    window.removeEventListener('pointermove', handleDragMove, true)
    ed.off('block:drag:start', onDragStart)
    ed.off('block:drag:stop', onDragStop)
    ed.off('canvas:dragover', onCanvasDragOver)
    ed.off('component:add', onComponentAdd)
    ed.off('component:drag:end', onDragEnd)
    ed.off('component:selected', onSelected)
    ed.off('component:update', onComponentUpdate)
  }
}
