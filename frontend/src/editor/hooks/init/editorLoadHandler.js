import { injectStylesheetsIntoCanvas, runDevModeStylesValidation } from '../../utils/styleUtils'
import { setCanvasZoom, applyDeviceViewport } from '../../plugins/canvasEnhancements'
import {
  applyTextSizeAlignment,
  healFlowButtonsInEditor,
  configureFlowButtonResizable,
  configureBlockResizable,
  isFlowLayoutButton,
} from '../../utils/textSizeAlign'
import {
  healEditorHotspot,
  HOTSPOT_RESIZABLE,
} from '../../utils/overlayStacking'
import { setDcbEditorPreview } from '../../../services/flow/dcbStageUi'
import { ensureBlockManagerMounted, filterBlockElements } from '../../plugins/dragAndDrop'

export function setupEditorLoadHandler(ed, { funnelPageType, step, getIsMounted }) {
  const onLoad = () => {
    injectStylesheetsIntoCanvas(ed)

    const iframeDoc = ed.Canvas?.getDocument?.()
    if (iframeDoc) {
      runDevModeStylesValidation(iframeDoc)
    }
    ed.UndoManager.clear()
    setCanvasZoom(ed, 100)

    // Canva-style free-form drag
    ed.setDragMode('absolute')

    const wrapper = ed.getWrapper()
    if (wrapper) {
      const walk = (cmp) => {
        const style = cmp.getStyle() || {}
        const isHotspot = cmp.getAttributes()?.['data-tc-type'] === 'hotspot'

        // Clear leftover freeze from a previous stuck session
        const st = cmp.get('status')
        if (st === 'freezed' || st === 'freezed-selected') {
          cmp.set('status', '')
        }

        if (isHotspot) {
          healEditorHotspot(cmp, ed, { geometry: 'pixels' })
        }

        const isAbsolute = style.position === 'absolute' || isHotspot
        if (isAbsolute) {
          if (style.margin || style['margin-top'] || style['margin-left']) {
            const newStyle = { ...style }
            delete newStyle.margin
            delete newStyle['margin-top']
            delete newStyle['margin-left']
            delete newStyle['margin-right']
            delete newStyle['margin-bottom']
            cmp.setStyle(newStyle)
          }
          const parent = cmp.parent()
          if (parent) {
            const pStyle = parent.getStyle() || {}
            if (
              pStyle.position !== 'absolute' &&
              pStyle.position !== 'relative' &&
              pStyle.position !== 'fixed'
            ) {
              parent.addStyle({ position: 'relative' })
            }
          }
          cmp.set('resizable', isHotspot ? HOTSPOT_RESIZABLE : true)
          cmp.set('draggable', true)
        }
        if (style.height && !isHotspot) {
          try {
            applyTextSizeAlignment(cmp)
          } catch (_) {
            /* noop */
          }
        }
        if (isFlowLayoutButton(cmp)) {
          configureFlowButtonResizable(cmp)
        } else if (!isAbsolute) {
          configureBlockResizable(cmp)
        }
        cmp.components().forEach(walk)
      }
      walk(wrapper)
      // One-shot heal; styleUpdate handler is reentrancy-guarded so this cannot freeze the tab
      healFlowButtonsInEditor(ed)

      // DOM boxes ready after first paint — fix blown hotspots, then clear dirty
      setTimeout(() => {
        if (!getIsMounted()) return
        const w = ed.getWrapper()
        if (w) {
          const walkHs = (cmp) => {
            if (cmp.getAttributes()?.['data-tc-type'] === 'hotspot') {
              healEditorHotspot(cmp, ed, { geometry: 'pixels' })
            }
            cmp.components()?.forEach?.(walkHs)
          }
          walkHs(w)
        }
        try {
          ed.UndoManager.clear()
        } catch (_) {
          /* noop */
        }
      }, 200)
    }

    try {
      const cssRules = ed.CssComposer.getAll()
      cssRules.forEach((rule) => {
        const selectors = rule.getSelectors().getFullString()
        if (
          selectors.includes('wellness-otp-container') ||
          selectors.includes('wellness-confirm-container') ||
          selectors.includes('wellness-home-container')
        ) {
          const style = rule.getStyle() || {}
          if (style['min-height'] === '100vh') {
            rule.addStyle({ 'min-height': 'auto' })
          }
        }
      })
    } catch (e) {
      console.error('Failed to heal CSS rules:', e)
    }

    if (String(funnelPageType || '').toUpperCase() === 'OTP') {
      setDcbEditorPreview(ed, step || 'number')
    }

    requestAnimationFrame(() => {
      ensureBlockManagerMounted(ed)
      filterBlockElements(ed, 'sections', '')
      try {
        ed.setDevice('Mobile')
      } catch (_) {}
      const selectedDev = ed.Devices.getSelected()
      if (selectedDev) {
        applyDeviceViewport(ed, String(selectedDev.get('name')))
      }
    })
  }

  ed.on('load', onLoad)

  return () => {
    ed.off('load', onLoad)
  }
}
