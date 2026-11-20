import './editor.css'
import { useEffect, useRef, useState } from 'react'
import { EditorProvider } from './context/EditorContext'
import { EditorShell } from './shell/EditorShell'
import { useDeviceLayout } from './hooks/useDeviceLayout'
import { useEditorSave } from './hooks/useEditorSave'
import { useEditorInit } from './hooks/useEditorInit'
import { setDcbEditorPreview } from '../services/flow/dcbStageUi'

export default function TemplateEditor({
  projectId,
  projectTitle,
  breadcrumbLabel,
  breadcrumbHref,
  funnelPageType,
  verificationMode,
  campaignId,
  countryCode,
  operatorCode,
  projectCreatedAt,
  projectMetadata,
  initialData,
  onSave,
  onDirtyChange,
  onPreview,
  saveHandler,
  step,
}) {
  const containerRef = useRef(null)
  const editorRef = useRef(null)

  const [zoom, setZoom] = useState(100)
  const [advancedMode, setAdvancedMode] = useState(false)

  const callbacksRef = useRef({
    onSave,
    onDirtyChange,
    onPreview,
    projectCreatedAt,
    projectMetadata,
    projectId,
    projectTitle,
    saveHandler,
    customWidth: '1200',
    customHeight: '800',
  })

  const {
    isDirty,
    setIsDirty,
    saving,
    handleSave,
    handlePreview,
    handlePublish,
    handleExportCurrent,
    handleExportAll,
  } = useEditorSave({ editorRef, callbacksRef })

  const {
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
  } = useDeviceLayout({
    editorRef,
    initialData,
    callbacksRef,
    setIsDirty,
    funnelPageType,
    step,
  })

  useEffect(() => {
    callbacksRef.current = {
      onSave,
      onDirtyChange,
      onPreview,
      projectCreatedAt,
      projectMetadata,
      projectId,
      projectTitle,
      saveHandler,
      customWidth,
      customHeight,
    }
  }, [
    onSave,
    onDirtyChange,
    onPreview,
    projectCreatedAt,
    projectMetadata,
    projectId,
    projectTitle,
    saveHandler,
    customWidth,
    customHeight,
  ])

  const { editor, isEmpty, selectionVersion, refreshSelection, dragDebug } = useEditorInit({
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
  })

  // Synchronize DCB editor preview when funnelPageType is OTP and step changes
  useEffect(() => {
    if (!editor || String(funnelPageType || '').toUpperCase() !== 'OTP') return undefined
    const currentStep = step || 'number'
    const apply = () => setDcbEditorPreview(editor, currentStep)
    apply()
    editor.on('canvas:frame:load', apply)
    editor.on('canvas:ready', apply)
    editor.on('component:mount', apply)
    editor.on('component:add', apply)
    editor.on('component:update', apply)
    return () => {
      editor.off('canvas:frame:load', apply)
      editor.off('canvas:ready', apply)
      editor.off('component:mount', apply)
      editor.off('component:add', apply)
      editor.off('component:update', apply)
    }
  }, [editor, funnelPageType, step])

  const contextValue = {
    editor,
    isEmpty,
    device,
    zoom,
    advancedMode,
    funnelPageType,
    verificationMode,
    step,
    campaignId,
    countryCode,
    operatorCode,
    customWidth,
    customHeight,
    setAdvancedMode,
    setZoom,
    setDevice,
    switchDevice,
    setCustomWidth,
    setCustomHeight,
    refreshSelection,
    selectionVersion,
    dragDebug,
  }

  return (
    <EditorProvider value={contextValue}>
      <EditorShell
        projectTitle={projectTitle}
        breadcrumbLabel={breadcrumbLabel}
        breadcrumbHref={breadcrumbHref}
        funnelPageType={funnelPageType}
        isDirty={isDirty}
        saving={saving}
        canvasRef={containerRef}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
        onExportCurrent={handleExportCurrent}
        onExportAll={handleExportAll}
      />
    </EditorProvider>
  )
}
