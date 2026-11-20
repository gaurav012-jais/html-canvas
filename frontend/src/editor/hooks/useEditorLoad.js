import { setupPagesManager } from '../plugins/pagesManager'
import { loadIntoEditor } from '../services/loadTemplate'
import { restoreAssetsFromProjectData } from '../plugins/assetUpload'
import { ensureAllTextEditable } from '../utils/textContent'
import { injectStylesheetsIntoCanvas } from '../utils/styleUtils'
import { syncCanvasFrameHeight } from '../plugins/canvasEnhancements'
import { setDcbEditorPreview } from '../../services/flow/dcbStageUi'
import useStore from '../../store/useStore'

export function loadTemplateData({
  ed,
  initialData,
  layoutsRef,
  funnelPageType,
  step,
  getIsMounted,
}) {
  const hasExistingPages =
    initialData?.projectData &&
    typeof initialData.projectData === 'object' &&
    Array.isArray(initialData.projectData.pages) &&
    initialData.projectData.pages.length > 0

  if (!hasExistingPages) {
    setupPagesManager(ed)
  }

  try {
    const mobileLayout = layoutsRef?.current?.mobile
    const desktopLayout = layoutsRef?.current?.desktop
    const layoutToLoad = mobileLayout?.html
      ? mobileLayout
      : desktopLayout?.html
        ? desktopLayout
        : null

    loadIntoEditor(
      ed,
      layoutToLoad?.html
        ? { html: layoutToLoad.html, css: layoutToLoad.css, projectData: initialData.projectData }
        : initialData
    )
  } catch (err) {
    console.error('[TemplateEditor] Error loading template:', err)
    const addToast = useStore.getState().addToast
    if (typeof addToast === 'function') {
      addToast(err.message || 'Failed to load template', 'error')
    }
  }

  const intervals = [0, 50, 150, 300, 600, 1200]
  intervals.forEach((delay) => {
    setTimeout(() => {
      if (!getIsMounted()) return
      ensureAllTextEditable(ed)
      injectStylesheetsIntoCanvas(ed)
      syncCanvasFrameHeight(ed)
      if (String(funnelPageType || '').toUpperCase() === 'OTP') {
        setDcbEditorPreview(ed, step || 'number')
      }
    }, delay)
  })

  restoreAssetsFromProjectData(ed, initialData?.projectData)
}
