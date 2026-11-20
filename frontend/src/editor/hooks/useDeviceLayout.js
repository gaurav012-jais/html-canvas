import { useRef, useState, useEffect, useCallback } from 'react'
import {
  cloneLayout,
  layoutKeyForDevice,
  LAYOUT_MOBILE,
  parseDeviceLayouts,
  snapshotLayout,
} from '../services/deviceLayouts'
import { loadIntoEditor } from '../services/loadTemplate'
import { ensureAllTextEditable } from '../utils/textContent'
import { injectStylesheetsIntoCanvas } from '../utils/styleUtils'
import { healFlowButtonsInEditor } from '../utils/textSizeAlign'
import { healEditorHotspot } from '../utils/overlayStacking'
import { syncCanvasFrameHeight } from '../plugins/canvasEnhancements'
import { setDcbEditorPreview } from '../../services/flow/dcbStageUi'
import { commitActiveRte } from './useEditorSave'

export function useDeviceLayout({
  editorRef,
  initialData,
  callbacksRef,
  setIsDirty,
  funnelPageType,
  step,
}) {
  const layoutsRef = useRef(
    parseDeviceLayouts(initialData?.projectData, initialData?.html, initialData?.css)
  )
  const layoutSwitchRef = useRef(false)
  const deviceRef = useRef('Mobile')

  const [device, setDevice] = useState('Mobile')
  const [customWidth, setCustomWidth] = useState(
    () => initialData?.projectData?.customWidth?.toString() || '1200'
  )
  const [customHeight, setCustomHeight] = useState(
    () => initialData?.projectData?.customHeight?.toString() || '800'
  )

  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !customWidth) return
    const customDevice = ed.Devices.get('Custom')
    if (customDevice) {
      const px = `${customWidth}px`
      if (customDevice.get('width') !== px) {
        customDevice.set('width', px)
      }
    }
    const selected = ed.Devices.getSelected()
    if (selected && String(selected.get('name')) === 'Custom') {
      const frameEl = ed.Canvas?.getFrameEl?.()
      if (frameEl) frameEl.style.width = `${customWidth}px`
    }
  }, [editorRef, customWidth])

  const switchDevice = useCallback(
    (nextName) => {
      const ed = editorRef.current
      if (!ed || !nextName) return
      commitActiveRte(ed)
      const prevName = deviceRef.current || 'Desktop'
      const fromKey = layoutKeyForDevice(prevName)
      const toKey = layoutKeyForDevice(nextName)

      if (!layoutsRef.current) {
        layoutsRef.current = { desktop: null, mobile: null }
      }
      const { customWidth: cw, customHeight: ch } = callbacksRef.current || {}
      const currentSnapshot = snapshotLayout(ed, prevName, cw, ch)
      layoutsRef.current[fromKey] = currentSnapshot

      if (fromKey !== toKey) {
        // Preserve existing device layout if present; only clone if target layout does not exist yet
        let target = layoutsRef.current[toKey]
        if (!target || !target.html) {
          target = cloneLayout(currentSnapshot, {
            customWidth: toKey === LAYOUT_MOBILE ? '375' : cw,
          })
          if (target) {
            layoutsRef.current[toKey] = target
            setIsDirty(true)
            callbacksRef.current?.onDirtyChange?.(true)
          }
        }
        ed.__tcLayouts = layoutsRef.current
        if (target?.html) {
          layoutSwitchRef.current = true
          try {
            loadIntoEditor(ed, target)
            healFlowButtonsInEditor(ed)
            const wrapper = ed.getWrapper()
            if (wrapper) {
              const walk = (cmp) => {
                if (cmp.getAttributes?.()?.['data-tc-type'] === 'hotspot') {
                  try {
                    healEditorHotspot(cmp, ed, { geometry: 'pixels' })
                  } catch (_) {
                    /* noop */
                  }
                }
                cmp.components?.()?.forEach?.(walk)
              }
              walk(wrapper)
            }
            injectStylesheetsIntoCanvas(ed)
            ensureAllTextEditable(ed)
            if (String(funnelPageType || '').toUpperCase() === 'OTP') {
              setDcbEditorPreview(ed, step || 'number')
            }
          } finally {
            window.setTimeout(() => {
              layoutSwitchRef.current = false
              syncCanvasFrameHeight(ed, { allowShrink: true })
              if (String(funnelPageType || '').toUpperCase() === 'OTP') {
                setDcbEditorPreview(ed, step || 'number')
              }
            }, 80)
          }
        }
      } else {
        ed.__tcLayouts = layoutsRef.current
      }

      ed.setDevice(nextName)
      deviceRef.current = nextName
      setDevice(nextName)
    },
    [editorRef, callbacksRef, setIsDirty, funnelPageType, step]
  )

  return {
    layoutsRef,
    layoutSwitchRef,
    deviceRef,
    device,
    setDevice,
    customWidth,
    setCustomWidth,
    customHeight,
    setCustomHeight,
    switchDevice,
  }
}
