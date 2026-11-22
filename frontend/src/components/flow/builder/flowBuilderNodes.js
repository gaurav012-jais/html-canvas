import { PAGE_TYPE_LABELS } from '../../../services/api/campaigns'
import {
  START_NODE_ID,
  isMetaNodeId,
  isMetaPageType,
  normalizeStartConfig,
} from '../startConfig'
import { orangeBfPageLabel, orangeBfPageSubtitle } from './builderUtils'

export function createAddNodeHandler({
  nodes,
  setNodes,
  setEdges,
  mode,
  isLocked,
  existingPageTypes,
}) {
  return (pageType) => {
    if (isLocked || existingPageTypes.has(pageType)) return
    const offset = nodes.length * 30
    if (pageType === 'OTP' && mode !== 'UNIVERSE_DCB' && mode !== 'ORANGE_BF') {
      setNodes((nds) => [
        ...nds,
        {
          id: 'OTP_NUMBER',
          type: 'pageNode',
          position: { x: 120 + offset, y: 120 + offset },
          data: {
            label: 'Mobile Number',
            subtitle: 'Enter mobile number',
            pageType: 'OTP',
            step: 'number',
            editQuery: { step: 'number' },
          },
        },
        {
          id: 'OTP_VERIFY',
          type: 'pageNode',
          position: { x: 340 + offset, y: 120 + offset },
          data: {
            label: 'Verify OTP',
            subtitle: 'Enter SMS code',
            pageType: 'OTP',
            step: 'otp',
            editQuery: { step: 'otp' },
          },
        },
      ])
      setEdges((eds) => [
        ...eds,
        {
          id: `OTP_NUMBER-OTP_sent-OTP_VERIFY-${Date.now()}`,
          source: 'OTP_NUMBER',
          target: 'OTP_VERIFY',
          label: 'OTP sent',
          animated: true,
          data: { condition: 'OTP sent' },
        },
      ])
      return
    }
    setNodes((nds) => [
      ...nds,
      {
        id: pageType,
        type: 'pageNode',
        position: { x: 120 + offset, y: 120 + offset },
        data: {
          label:
            mode === 'ORANGE_BF'
              ? orangeBfPageLabel(pageType)
              : PAGE_TYPE_LABELS[pageType] || pageType,
          subtitle: mode === 'ORANGE_BF' ? orangeBfPageSubtitle(pageType) : undefined,
          pageType,
        },
      },
    ])
  }
}

export function createRemoveNodeHandler({
  nodes,
  setNodes,
  setEdges,
  setSelectedNodeId,
  entryPage,
  setEntryPage,
  addToast,
  isLocked,
}) {
  return (nodeId) => {
    if (isLocked) return
    if (isMetaNodeId(nodeId)) {
      addToast('START and END cannot be removed', 'error')
      return
    }
    if (nodeId === 'OTP_NUMBER' || nodeId === 'OTP_VERIFY') {
      const otpIds = new Set(['OTP_NUMBER', 'OTP_VERIFY', 'OTP'])
      setNodes((nds) => nds.filter((n) => !otpIds.has(n.id)))
      setEdges((eds) => eds.filter((e) => !otpIds.has(e.source) && !otpIds.has(e.target)))
      setSelectedNodeId(null)
      if (entryPage === 'OTP') {
        const remaining = nodes.filter(
          (n) => !otpIds.has(n.id) && !isMetaPageType(n.data?.pageType),
        )
        setEntryPage(remaining[0]?.data?.pageType || 'HOME')
      }
      addToast('OTP pages removed from flow', 'success')
      return
    }
    const removed = nodes.find((n) => n.id === nodeId)
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev))
    if (removed?.data?.pageType === entryPage) {
      const remaining = nodes.filter(
        (n) => n.id !== nodeId && !isMetaPageType(n.data?.pageType),
      )
      setEntryPage(remaining[0]?.data?.pageType || 'HOME')
    }
    addToast('Page removed from flow', 'success')
  }
}

export function createPatchStartConfigHandler({
  mode,
  setNodes,
  setStartConfig,
  isLocked,
}) {
  return (patch) => {
    if (isLocked) return
    setStartConfig((prev) => {
      const next = normalizeStartConfig({ ...prev, ...patch }, mode)
      setNodes((nds) =>
        nds.map((n) =>
          n.id === START_NODE_ID
            ? { ...n, data: { ...n.data, startConfig: next } }
            : n,
        ),
      )
      return next
    })
  }
}

export function buildDisplayNodes({
  nodes,
  selectedNodeId,
  entryPage,
  startConfig,
  editNode,
  removeNode,
}) {
  return nodes.map((n) => ({
    ...n,
    selected: n.id === selectedNodeId,
    data: {
      ...n.data,
      isEntry:
        (entryPage === 'OTP' && (n.id === 'OTP_NUMBER' || n.data.step === 'number')) ||
        (n.id !== 'OTP_VERIFY' && n.data.pageType === entryPage),
      startConfig: n.id === START_NODE_ID ? startConfig : n.data.startConfig,
      onEdit: () => editNode(n.data.pageType, n.data.editQuery),
      onDelete: () => removeNode(n.id),
    },
  }))
}
