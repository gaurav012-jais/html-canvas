import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNodesState, useEdgesState } from '@xyflow/react'
import { isApiExposeEntry } from '../verificationModes'
import { defaultStartConfig, isMetaPageType } from '../startConfig'
import useStore from '../../../store/useStore'
import { campaignEditPath } from '../../../utils/routes'
import { validateAndBuildFlowConfig } from './flowBuilderConfig'
import { useFlowBuilderTemplates } from './flowBuilderTemplates'
import { useFlowLoader } from './flowBuilderLoader'
import { useFlowConnections } from './useFlowConnections'
import {
  createAddNodeHandler,
  createRemoveNodeHandler,
  createPatchStartConfigHandler,
  buildDisplayNodes,
} from './flowBuilderNodes'

export function useFlowBuilderState({
  campaignId,
  countryCode,
  operatorCode,
}) {
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const loadCampaignFlow = useStore((s) => s.loadCampaignFlow)
  const saveCampaignFlow = useStore((s) => s.saveCampaignFlow)
  const applyCampaignDefaults = useStore((s) => s.applyCampaignDefaults)
  const [resettingPages, setResettingPages] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = useState('BOTH')
  const [isLocked, setIsLocked] = useState(false)
  const [entryPage, setEntryPage] = useState('HOME')
  const [afterIdentity, setAfterIdentity] = useState('HOME')
  const [startConfig, setStartConfig] = useState(() => defaultStartConfig('BOTH'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  const {
    handleResetFlow,
    handleResetPages,
    handleModeChange,
    handleEntryPageChange,
    handleAfterIdentityChange,
  } = useFlowBuilderTemplates({
    mode,
    setMode,
    entryPage,
    setEntryPage,
    afterIdentity,
    setAfterIdentity,
    isLocked,
    setStartConfig,
    setNodes,
    setEdges,
    setErrors,
    addToast,
    campaignId,
    applyCampaignDefaults,
    setResettingPages,
  })

  useFlowLoader({
    campaignId,
    loadCampaignFlow,
    setLoading,
    setMode,
    setIsLocked,
    setEntryPage,
    setAfterIdentity,
    setStartConfig,
    setNodes,
    setEdges,
  })

  const {
    newConnSource,
    setNewConnSource,
    newConnTarget,
    setNewConnTarget,
    newConnCondition,
    setNewConnCondition,
    newConnSourcePageType,
    newConnConditionOptions,
    onConnect,
    setEdgeCondition,
    removeEdge,
    addConnection,
    onNodesDelete,
    getEdgeConditionOptions,
  } = useFlowConnections({
    nodes,
    edges,
    setEdges,
    mode,
    isLocked,
    setSelectedNodeId,
    addToast,
  })

  const pageNodes = useMemo(
    () => nodes.filter((n) => !isMetaPageType(n.data?.pageType)),
    [nodes],
  )

  const existingPageTypes = useMemo(
    () => new Set(pageNodes.map((n) => n.data.pageType)),
    [pageNodes],
  )

  const addNode = useCallback(
    createAddNodeHandler({
      nodes,
      setNodes,
      setEdges,
      mode,
      isLocked,
      existingPageTypes,
    }),
    [existingPageTypes, nodes.length, setNodes, setEdges, mode, isLocked],
  )

  const removeNode = useCallback(
    createRemoveNodeHandler({
      nodes,
      setNodes,
      setEdges,
      setSelectedNodeId,
      entryPage,
      setEntryPage,
      addToast,
      isLocked,
    }),
    [setNodes, setEdges, addToast, nodes, entryPage, isLocked],
  )

  const patchStartConfig = useCallback(
    createPatchStartConfigHandler({ mode, setNodes, setStartConfig, isLocked }),
    [mode, setNodes, isLocked],
  )

  const editNode = useCallback(
    (pageType, query) => {
      if (isMetaPageType(pageType)) return
      navigate(campaignEditPath(countryCode, operatorCode, campaignId, pageType, query))
    },
    [campaignId, navigate, countryCode, operatorCode],
  )

  const displayNodes = useMemo(
    () =>
      buildDisplayNodes({
        nodes,
        selectedNodeId,
        entryPage,
        startConfig,
        editNode,
        removeNode,
      }),
    [nodes, selectedNodeId, entryPage, editNode, removeNode, startConfig],
  )

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  const showApiExpose = (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') && isApiExposeEntry(entryPage)

  const handleSave = useCallback(async () => {
    const { errors: clientErrors, hardErrors, flowConfig } = validateAndBuildFlowConfig({
      nodes,
      edges,
      pageNodes,
      mode,
      entryPage,
      startConfig,
      isLocked,
      showApiExpose,
    })

    if (hardErrors.length > 0) {
      setErrors(hardErrors)
      addToast(hardErrors[0], 'error')
      return
    }

    setSaving(true)
    setErrors(clientErrors)
    try {
      await saveCampaignFlow(campaignId, { verificationMode: mode, flowConfig })
      setErrors([])
      addToast('Flow saved', 'success')
    } catch (err) {
      const msg = err.message || 'Failed to save flow'
      setErrors([msg])
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }, [
    campaignId,
    nodes,
    edges,
    mode,
    entryPage,
    pageNodes,
    startConfig,
    isLocked,
    showApiExpose,
    saveCampaignFlow,
    addToast,
  ])

  return {
    nodes,
    edges,
    mode,
    isLocked,
    entryPage,
    afterIdentity,
    startConfig,
    loading,
    saving,
    errors,
    resettingPages,
    selectedNodeId,
    newConnSource,
    newConnTarget,
    newConnCondition,
    pageNodes,
    existingPageTypes,
    displayNodes,
    selectedNode,
    newConnSourcePageType,
    newConnConditionOptions,
    showApiExpose,
    setIsLocked,
    setEntryPage,
    setAfterIdentity,
    setSelectedNodeId,
    setNewConnSource,
    setNewConnTarget,
    setNewConnCondition,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    removeNode,
    editNode,
    patchStartConfig,
    setEdgeCondition,
    removeEdge,
    addConnection,
    onNodesDelete,
    getEdgeConditionOptions,
    handleResetFlow,
    handleResetPages,
    handleModeChange,
    handleEntryPageChange,
    handleAfterIdentityChange,
    handleSave,
  }
}
