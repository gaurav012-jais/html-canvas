import { useEffect, useRef, useState, useCallback } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import { createGrapesConfig } from '../grapesConfig'
import { registerAllBlocks } from '../blocks'
import { setupAssetUpload } from '../plugins/assetUpload'
import { setupAssetCanvasDrop } from '../plugins/assetDrag'
import { setupCanvasEnhancements } from '../plugins/canvasEnhancements'
import { setupDragUnstick } from '../plugins/dragUnstick'
import { setupEditorExperience } from '../plugins/editorExperience'
import { setupTextEditing } from '../plugins/textEditing'
import { setupDragAndDrop } from '../plugins/dragAndDrop'
import { injectStylesheetsIntoCanvas } from '../utils/styleUtils'
import { loadTemplateData } from './useEditorLoad'
import { parseDeviceLayouts } from '../services/deviceLayouts'
import { registerHotspotCommands } from './init/hotspotCommands'
import { setupSectionNaming } from './init/sectionNaming'
import { setupCanvasDropPositioning } from './init/canvasDropPositioning'
import { setupEditorLoadHandler } from './init/editorLoadHandler'

export function useEditorInit({
  containerRef,
  editorRef,
  projectId,
  initialData,
  funnelPageType,
  verificationMode,
  step,
  layoutsRef,
  layoutSwitchRef,
  deviceRef,
  setDevice,
  callbacksRef,
  setIsDirty,
  handleSave,
}) {
  const initializedRef = useRef(false)
  const cleanupExperienceRef = useRef(null)

  const [editor, setEditor] = useState(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [dragDebug, setDragDebug] = useState({
    draggedItem: null,
    selectedItem: null,
    editorState: 'idle',
    componentCount: 0,
    lastEvent: '—',
    dropSuccess: false,
    isDragging: false,
    isOverCanvas: false,
  })

  const refreshSelection = useCallback(() => setSelectionVersion((v) => v + 1), [])

  useEffect(() => {
    if (import.meta.env.DEV) console.log('[TemplateEditor] useEffect triggered for projectId:', projectId)
    if (!containerRef.current || initializedRef.current) {
      if (import.meta.env.DEV) {
        console.log('[TemplateEditor] useEffect skip. Already initialized:', initializedRef.current)
      }
      return
    }

    if (import.meta.env.DEV) console.log('[TemplateEditor] Initializing GrapesJS...')
    initializedRef.current = true
    let mounted = true

    if (containerRef.current) containerRef.current.innerHTML = ''
    const blocksMount = document.getElementById('tc-blocks-mount')
    if (blocksMount) blocksMount.innerHTML = ''
    const layersMount = document.getElementById('tc-layers-panel')
    if (layersMount) layersMount.innerHTML = ''

    const config = createGrapesConfig(containerRef.current)
    const hostLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => l.href)
      .filter(Boolean)
    const defaultStyles = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
      'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    ]
    if (config.canvas) {
      config.canvas.styles = [
        ...(config.canvas.styles || []),
        ...defaultStyles,
        ...hostLinks,
      ]
    }

    const ed = grapesjs.init(config)
    editorRef.current = ed
    layoutsRef.current = parseDeviceLayouts(
      initialData?.projectData,
      initialData?.html,
      initialData?.css
    )
    ed.__tcLayouts = layoutsRef.current
    setEditor(ed)

    registerHotspotCommands(ed)

    if (import.meta.env.DEV) {
      window.editor = ed
    }

    registerAllBlocks(ed, funnelPageType, verificationMode)
    setupAssetUpload(ed)
    setupAssetCanvasDrop(ed)
    const cleanupDragAndDrop = setupDragAndDrop(ed, setDragDebug)
    const cleanupCanvasEnhancements = setupCanvasEnhancements(
      ed,
      (empty) => mounted && setIsEmpty(empty)
    )
    const cleanupDragUnstick = setupDragUnstick(ed)
    const cleanupTextEditing = setupTextEditing(ed, refreshSelection)

    const getIsMounted = () => mounted && editorRef.current === ed

    const cleanupSectionNaming = setupSectionNaming(ed, getIsMounted)
    const cleanupCanvasDrop = setupCanvasDropPositioning(ed, getIsMounted, refreshSelection)
    const cleanupEditorLoad = setupEditorLoadHandler(ed, { funnelPageType, step, getIsMounted })

    ed.on('change:changesCount', () => {
      if (!mounted || layoutSwitchRef?.current) return
      setIsDirty(true)
      callbacksRef?.current?.onDirtyChange?.(true)
    })

    ed.on('component:selected', () => mounted && refreshSelection())
    ed.on('component:deselected', () => mounted && refreshSelection())

    ed.on('page:select', () => injectStylesheetsIntoCanvas(ed))
    ed.on('canvas:ready', () => injectStylesheetsIntoCanvas(ed))
    ed.on('device:select', (dev) => {
      if (!mounted) return
      const name = dev?.get('name') || 'Desktop'
      if (deviceRef) deviceRef.current = name
      setDevice?.(name)
    })

    // Load template data and initial styles/assets
    loadTemplateData({
      ed,
      initialData,
      layoutsRef,
      funnelPageType,
      step,
      getIsMounted,
    })

    cleanupExperienceRef.current = setupEditorExperience(ed, { onSave: handleSave })

    return () => {
      if (import.meta.env.DEV) console.log('[TemplateEditor] useEffect cleanup: destroying GrapesJS...')
      mounted = false
      initializedRef.current = false
      cleanupExperienceRef.current?.()
      cleanupDragAndDrop?.()
      cleanupCanvasEnhancements?.()
      cleanupDragUnstick?.()
      cleanupTextEditing?.()
      cleanupSectionNaming?.()
      cleanupCanvasDrop?.()
      cleanupEditorLoad?.()
      ed.destroy()
      editorRef.current = null
      setEditor(null)

      const bMount = document.getElementById('tc-blocks-mount')
      if (bMount) bMount.innerHTML = ''
      const lMount = document.getElementById('tc-layers-panel')
      if (lMount) lMount.innerHTML = ''
    }
  }, [projectId])

  return {
    editor,
    isEmpty,
    selectionVersion,
    refreshSelection,
    dragDebug,
  }
}
