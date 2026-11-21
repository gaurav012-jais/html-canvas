import { useState, useCallback } from 'react'
import { getTemplatePayload } from '../services/saveTemplate'
import { exportAllPagesFromEditor, exportCurrentPageFromEditor } from '../services/exportSite'
import useStore from '../../store/useStore'
import { trackEvent } from '../../utils/tracking'

export function commitActiveRte(ed) {
  if (!ed) return
  try {
    if (ed.Commands?.isActive?.('core:rte')) {
      ed.Commands.stop('core:rte')
    }
  } catch (_) {}
  try {
    if (ed.rte?.end) {
      ed.rte.end()
    }
  } catch (_) {}
}

export function useEditorSave({ editorRef, callbacksRef }) {
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const handleSave = useCallback(async () => {
    const ed = editorRef.current
    if (!ed) return
    commitActiveRte(ed)
    setSaving(true)
    try {
      const {
        projectId: id,
        projectTitle: name,
        projectCreatedAt: createdAt,
        projectMetadata: metadata,
        onSave: saveCb,
        onDirtyChange: dirtyCb,
        saveHandler: customSave,
        customWidth: cw,
        customHeight: ch,
      } = callbacksRef.current || {}

      const meta = { id, name, createdAt, metadata, customWidth: cw, customHeight: ch }
      if (!customSave) {
        useStore.getState().addToast('Save handler not configured', 'error')
        return
      }
      const saved = await customSave(ed, meta)
      dirtyCb?.(false)
      setIsDirty(false)
      saveCb?.(saved)
    } finally {
      setSaving(false)
    }
  }, [editorRef, callbacksRef])

  const handlePreview = useCallback(async () => {
    const ed = editorRef.current
    if (!ed) return
    commitActiveRte(ed)
    const { projectTitle: name, onPreview: previewCb } = callbacksRef.current || {}
    // Auto-save so Preview matches what you see on the canvas (WYSIWYG)
    if (isDirty) {
      await handleSave()
    }
    if (previewCb) {
      previewCb(getTemplatePayload(ed, name))
    }
  }, [editorRef, callbacksRef, isDirty, handleSave])

  const handlePublish = useCallback(async () => {
    await handleSave()
    handlePreview()
  }, [handleSave, handlePreview])

  const handleExportCurrent = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    commitActiveRte(ed)
    exportCurrentPageFromEditor(ed, callbacksRef.current?.projectTitle)
    trackEvent('exports')
  }, [editorRef, callbacksRef])

  const handleExportAll = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    commitActiveRte(ed)
    exportAllPagesFromEditor(ed, callbacksRef.current?.projectTitle)
    trackEvent('exports')
  }, [editorRef, callbacksRef])

  return {
    isDirty,
    setIsDirty,
    saving,
    handleSave,
    handlePreview,
    handlePublish,
    handleExportCurrent,
    handleExportAll,
  }
}
