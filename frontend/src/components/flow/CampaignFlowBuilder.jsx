import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Save, Lock, Unlock } from 'lucide-react'
import Button from '../ui/Button'
import { getDefaultCondition, getValidConditions } from './flowConditions'
import {
  applyUniverseDcbGraphLayout,
  buildDefaultFlow,
  normalizeModeId,
  isApiExposeEntry,
  resolveAfterIdentityTarget,
} from './verificationModes'
import {
  START_NODE_ID,
  defaultStartConfig,
  normalizeStartConfig,
  stripMetaNodes,
  isMetaPageType,
  isMetaNodeId,
} from './startConfig'
import useStore from '../../store/useStore'
import { PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import { campaignEditPath } from '../../utils/routes'
import FlowCampaignSettings from './FlowCampaignSettings'
import {
  nodeTypes,
  orangeBfPageLabel,
  orangeBfPageSubtitle,
  toRfNodes,
  toRfEdges,
} from './builder/builderUtils'
import FlowModeConfigCard from './builder/FlowModeConfigCard'
import FlowSelectedNodeCard from './builder/FlowSelectedNodeCard'
import FlowStartChecksCard from './builder/FlowStartChecksCard'
import FlowConnectionsCard from './builder/FlowConnectionsCard'
import FlowPagesCard from './builder/FlowPagesCard'

export { orangeBfPageLabel, orangeBfPageSubtitle }

/**
 * Drag-drop flowConfig editor — used on Campaign Detail (embedded)
 * and optionally as a standalone page shell.
 */
function CampaignFlowBuilder({
  campaignId,
  countryCode,
  operatorCode,
  embedded = false,
  embeddedStudio = false,
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
  const [newConnSource, setNewConnSource] = useState('')
  const [newConnTarget, setNewConnTarget] = useState('')
  const [newConnCondition, setNewConnCondition] = useState('DEFAULT')
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  const applyFlowTemplate = useCallback(
    (nextMode, nextEntry, nextAfter) => {
      const def = buildDefaultFlow(nextMode, {
        entryPage: nextMode === 'OTP_ONLY' || nextMode === 'UNIVERSE_DCB' ? nextEntry : 'HOME',
        afterIdentity: isApiExposeEntry(nextEntry) ? 'HOME' : nextAfter,
      })
      const nextStart = defaultStartConfig(nextMode)
      setStartConfig(nextStart)
      setNodes(toRfNodes(def, nextStart, nextMode))
      setEdges(toRfEdges(def, nextStart, nextMode))
      setEntryPage(def.entryPage || 'HOME')
      setAfterIdentity(resolveAfterIdentityTarget(def))
      setErrors([])
    },
    [setNodes, setEdges],
  )

  const handleResetFlow = useCallback(() => {
    if (isLocked) return
    applyFlowTemplate(mode, entryPage, afterIdentity)
    addToast('Flow graph reset to default template', 'success')
  }, [mode, entryPage, afterIdentity, applyFlowTemplate, addToast, isLocked])

  const handleResetPages = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all campaign pages to their default templates? Your clicks, vendor tracking, and traffic logs will NOT be deleted.',
      )
    ) {
      return
    }
    setResettingPages(true)
    try {
      await applyCampaignDefaults(campaignId)
      addToast('Pages reset to default templates successfully', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to reset pages', 'error')
    } finally {
      setResettingPages(false)
    }
  }, [campaignId, applyCampaignDefaults, addToast])

  const handleModeChange = useCallback(
    (newMode) => {
      if (isLocked) return
      setMode(newMode)
      applyFlowTemplate(
        newMode,
        newMode === 'OTP_ONLY' || newMode === 'UNIVERSE_DCB' ? 'OTP' : 'HOME',
        'HOME',
      )
    },
    [applyFlowTemplate, isLocked],
  )

  const handleEntryPageChange = useCallback(
    (nextEntry) => {
      if (isLocked) return
      const next = String(nextEntry || 'HOME').toUpperCase()
      setEntryPage(next)
      if (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') {
        applyFlowTemplate(mode, next, afterIdentity)
      }
    },
    [mode, afterIdentity, applyFlowTemplate, isLocked],
  )

  const handleAfterIdentityChange = useCallback(
    (nextAfter) => {
      if (isLocked) return
      const next = String(nextAfter || 'HOME').toUpperCase()
      setAfterIdentity(next)
      if (!isApiExposeEntry(entryPage)) {
        applyFlowTemplate(mode, entryPage, next)
      }
    },
    [mode, entryPage, applyFlowTemplate, isLocked],
  )

  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    setLoading(true)
    loadCampaignFlow(campaignId)
      .then((res) => {
        if (cancelled) return
        const nextMode = normalizeModeId(res.verificationMode)
        const flowConfig =
          nextMode === 'UNIVERSE_DCB'
            ? applyUniverseDcbGraphLayout(res.flowConfig)
            : res.flowConfig
        const nextStart = normalizeStartConfig(flowConfig?.startConfig, nextMode)
        setMode(nextMode)
        setIsLocked(Boolean(flowConfig?.isLocked ?? (nextMode === 'ORANGE_BF')))
        setEntryPage(flowConfig?.entryPage || 'HOME')
        setAfterIdentity(resolveAfterIdentityTarget(flowConfig))
        setStartConfig(nextStart)
        setNodes(toRfNodes(flowConfig, nextStart, nextMode))
        setEdges(toRfEdges(flowConfig, nextStart, nextMode))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [campaignId, setNodes, setEdges, loadCampaignFlow])

  const pageNodes = useMemo(
    () => nodes.filter((n) => !isMetaPageType(n.data?.pageType)),
    [nodes],
  )

  const existingPageTypes = useMemo(
    () => new Set(pageNodes.map((n) => n.data.pageType)),
    [pageNodes],
  )

  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const sourcePageType = sourceNode?.data?.pageType || connection.source
      const condition = getDefaultCondition(sourcePageType, mode)

      setEdges((eds) => {
        const duplicate = eds.some(
          (e) =>
            e.source === connection.source &&
            e.target === connection.target &&
            (e.data?.condition || 'DEFAULT') === condition,
        )
        if (duplicate) {
          addToast('This connection already exists', 'error')
          return eds
        }
        return addEdge(
          {
            ...connection,
            id: `${connection.source}-${condition}-${connection.target}-${Date.now()}`,
            label: condition,
            animated: true,
            data: { condition },
          },
          eds,
        )
      })
    },
    [setEdges, nodes, mode, addToast],
  )

  const addNode = useCallback(
    (pageType) => {
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
    },
    [existingPageTypes, nodes.length, setNodes, setEdges, mode, isLocked],
  )

  const removeNode = useCallback(
    (nodeId) => {
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
    },
    [setNodes, setEdges, addToast, nodes, entryPage, isLocked],
  )

  const patchStartConfig = useCallback(
    (patch) => {
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
    },
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
      nodes.map((n) => ({
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
      })),
    [nodes, selectedNodeId, entryPage, editNode, removeNode, startConfig],
  )

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  const setEdgeCondition = useCallback(
    (edgeId, condition) => {
      if (isLocked) return
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, label: condition, data: { ...e.data, condition } } : e,
        ),
      )
    },
    [setEdges, isLocked],
  )

  const removeEdge = useCallback(
    (edgeId) => {
      if (isLocked) return
      setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    },
    [setEdges, isLocked],
  )

  const newConnSourcePageType = useMemo(() => {
    const node = nodes.find((n) => n.id === newConnSource)
    return node?.data?.pageType || ''
  }, [nodes, newConnSource])

  const newConnConditionOptions = useMemo(
    () => getValidConditions(newConnSourcePageType, mode),
    [newConnSourcePageType, mode],
  )

  useEffect(() => {
    if (!newConnSourcePageType) return
    const defaultCondition = getDefaultCondition(newConnSourcePageType, mode)
    setNewConnCondition(defaultCondition)
  }, [newConnSourcePageType, mode])

  const addConnection = useCallback(() => {
    if (isLocked) return
    if (!newConnSource || !newConnTarget) {
      addToast('Select both From and To pages', 'error')
      return
    }
    if (newConnSource === newConnTarget) {
      addToast('From and To must be different pages', 'error')
      return
    }

    const condition = newConnCondition || getDefaultCondition(newConnSourcePageType, mode)
    const duplicate = edges.some(
      (e) =>
        e.source === newConnSource &&
        e.target === newConnTarget &&
        (e.data?.condition || 'DEFAULT') === condition,
    )
    if (duplicate) {
      addToast('This connection already exists', 'error')
      return
    }

    setEdges((eds) => [
      ...eds,
      {
        id: `${newConnSource}-${condition}-${newConnTarget}-${Date.now()}`,
        source: newConnSource,
        target: newConnTarget,
        label: condition,
        animated: true,
        data: { condition },
      },
    ])
    addToast('Connection added', 'success')
  }, [
    newConnSource,
    newConnTarget,
    newConnCondition,
    newConnSourcePageType,
    mode,
    edges,
    setEdges,
    addToast,
    isLocked,
  ])

  const onNodesDelete = useCallback(
    (deleted) => {
      const metaDeleted = deleted.some((n) => isMetaNodeId(n.id))
      if (metaDeleted) {
        addToast('START and END cannot be removed', 'error')
        return
      }
      const ids = new Set(deleted.map((n) => n.id))
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
      setSelectedNodeId(null)
      addToast('Page removed from flow', 'success')
    },
    [setEdges, addToast],
  )

  const getEdgeConditionOptions = useCallback(
    (sourceId, currentCondition) => {
      if (isMetaNodeId(sourceId)) {
        const fixed = sourceId === START_NODE_ID ? 'AFTER_CHECKS' : 'DONE'
        return currentCondition && currentCondition !== fixed
          ? [currentCondition, fixed]
          : [fixed]
      }
      const sourceNode = nodes.find((n) => n.id === sourceId)
      const valid = getValidConditions(sourceNode?.data?.pageType || sourceId, mode)
      if (currentCondition && !valid.includes(currentCondition)) {
        return [currentCondition, ...valid]
      }
      return valid
    },
    [nodes, mode],
  )

  const handleSave = useCallback(async () => {
    const clientErrors = []
    const pageTypes = new Set(pageNodes.map((n) => n.data.pageType))
    const isApiExpose =
      (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') && entryPage === 'API_EXPOSE'

    if (!isApiExpose) {
      if (!pageTypes.has(entryPage)) {
        clientErrors.push(
          `Start page "${PAGE_TYPE_LABELS[entryPage] || entryPage}" must be in the flow.`,
        )
      }
      if (
        (mode === 'OTP_ONLY' || mode === 'BOTH' || mode === 'UNIVERSE_DCB' || mode === 'ORANGE_BF') &&
        !pageTypes.has('OTP')
      ) {
        clientErrors.push(`Verification mode "${mode}" requires an OTP page node.`)
      }

      const entryNode = pageNodes.find((n) => n.data.pageType === entryPage)
      if (entryNode) {
        const reachable = new Set([entryNode.id])
        let changed = true
        while (changed) {
          changed = false
          for (const e of edges) {
            if (isMetaNodeId(e.source) || isMetaNodeId(e.target)) continue
            if (reachable.has(e.source) && !reachable.has(e.target)) {
              reachable.add(e.target)
              changed = true
            }
          }
        }
        const orphans = pageNodes.filter((n) => !reachable.has(n.id))
        if (orphans.length > 0) {
          const labels = orphans.map((n) => n.data.label).join(', ')
          clientErrors.push(
            `Note: "${labels}" not reachable from start page (${PAGE_TYPE_LABELS[entryPage] || entryPage}) and will be removed on save.`,
          )
        }
      }
    }

    const hardErrors = clientErrors.filter((e) => !e.startsWith('Note:'))
    if (hardErrors.length > 0) {
      setErrors(hardErrors)
      return
    }

    const rawConfig = isApiExpose
      ? {
          version: 1,
          entryPage: 'API_EXPOSE',
          startConfig: normalizeStartConfig(startConfig, mode),
          nodes: [],
          edges: [],
        }
      : {
          version: 1,
          entryPage: entryPage || 'HOME',
          startConfig: normalizeStartConfig(startConfig, mode),
          nodes: pageNodes.map((n) => ({
            id: n.id,
            pageType: n.data.pageType,
            position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
          })),
          edges: edges
            .filter((e) => !isMetaNodeId(e.source) && !isMetaNodeId(e.target))
            .map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              condition: e.data?.condition || 'DEFAULT',
            })),
        }
    const flowConfig = {
      ...stripMetaNodes(rawConfig),
      isLocked,
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
    } finally {
      setSaving(false)
    }
  }, [
    campaignId,
    mode,
    entryPage,
    pageNodes,
    edges,
    startConfig,
    isLocked,
    saveCampaignFlow,
    addToast,
  ])

  const nodeLabel = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node ? node.data.label : nodeId
  }

  const canvasHeight = embeddedStudio ? '480px' : embedded ? '500px' : '520px'
  const showApiExpose = (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') && isApiExposeEntry(entryPage)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold text-fg ${embedded ? 'text-sm' : 'page-header-title'}`}>
              Flow builder
            </h2>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Lock className="w-3 h-3" /> Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Unlock className="w-3 h-3" /> Editable
              </span>
            )}
          </div>
          <p className={`text-fg-muted mt-0.5 ${embedded ? 'text-xs' : 'page-header-description'}`}>
            START configures checks before the first page (HE / blocklist / checksub). END marks
            funnel outcomes. Edit page content from any page node.
            {mode === 'UNIVERSE_DCB' ? (
              <span className="block mt-1">
                Wifi path: <strong>Number then PIN</strong> → <strong>Choose pack</strong> → PIN
                on the same number page. HE skips number and opens packs.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLocked(!isLocked)}
            className="flex items-center gap-1.5"
          >
            {isLocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                Unlock Flow
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Lock Flow
              </>
            )}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save flow'}
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="surface-card p-3 bg-amber-50/70 border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>This flow graph is <strong>locked</strong>. Dragging, adding/removing nodes and changing connections are disabled. Click <strong>Unlock Flow</strong> above to make edits.</span>
          </div>
        </div>
      )}

      <FlowModeConfigCard
        mode={mode}
        isLocked={isLocked}
        entryPage={entryPage}
        afterIdentity={afterIdentity}
        handleModeChange={handleModeChange}
        handleEntryPageChange={handleEntryPageChange}
        handleAfterIdentityChange={handleAfterIdentityChange}
        handleResetFlow={handleResetFlow}
        handleResetPages={handleResetPages}
        resettingPages={resettingPages}
      />

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((e, i) =>
            e.startsWith('Note:') ? (
              <div
                key={i}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                ⚠️ {e.replace(/^Note:\s*/, '')}
              </div>
            ) : (
              <div
                key={i}
                className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
              >
                {e}
              </div>
            ),
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <div
          className="lg:col-span-3 surface-card overflow-hidden"
          style={{ height: canvasHeight }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-fg-muted">
              Loading flow...
            </div>
          ) : showApiExpose ? (
            <div className="flex items-center justify-center h-full text-sm text-fg-muted px-6 text-center">
              {mode === 'UNIVERSE_DCB'
                ? 'DCB API expose — no WAP page graph. Billing APIs are in the Vendors tab.'
                : 'API expose — no WAP page graph. OTP APIs are in the Vendors tab.'}
            </div>
          ) : (
            <ReactFlow
              nodes={displayNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={isLocked ? undefined : onNodesChange}
              onEdgesChange={isLocked ? undefined : onEdgesChange}
              onConnect={isLocked ? undefined : onConnect}
              nodesDraggable={!isLocked}
              nodesConnectable={!isLocked}
              elementsSelectable={!isLocked}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              onNodesDelete={isLocked ? undefined : onNodesDelete}
              connectOnClick={!isLocked}
              connectionMode={ConnectionMode.Loose}
              deleteKeyCode={isLocked ? null : ['Backspace', 'Delete']}
              defaultEdgeOptions={{
                animated: true,
                labelStyle: { fontSize: 10, fontWeight: 600 },
                labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
              }}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          )}
        </div>

        <div
          className="flex flex-col gap-3 lg:sticky lg:top-4 overflow-y-auto"
          style={{ maxHeight: canvasHeight }}
        >
          <FlowSelectedNodeCard
            selectedNode={selectedNode}
            editNode={editNode}
            removeNode={removeNode}
            isLocked={isLocked}
          />

          <FlowStartChecksCard
            mode={mode}
            startConfig={startConfig}
            patchStartConfig={patchStartConfig}
            isLocked={isLocked}
          />

          <FlowConnectionsCard
            pageNodes={pageNodes}
            edges={edges}
            newConnSource={newConnSource}
            setNewConnSource={setNewConnSource}
            newConnTarget={newConnTarget}
            setNewConnTarget={setNewConnTarget}
            newConnCondition={newConnCondition}
            setNewConnCondition={setNewConnCondition}
            newConnConditionOptions={newConnConditionOptions}
            addConnection={addConnection}
            removeEdge={removeEdge}
            setEdgeCondition={setEdgeCondition}
            getEdgeConditionOptions={getEdgeConditionOptions}
            nodeLabel={nodeLabel}
            isLocked={isLocked}
          />

          <FlowPagesCard
            pageNodes={pageNodes}
            existingPageTypes={existingPageTypes}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            editNode={editNode}
            addNode={addNode}
            mode={mode}
            isLocked={isLocked}
          />
        </div>
      </div>

      <FlowCampaignSettings campaignId={campaignId} />
    </div>
  )
}

export default memo(CampaignFlowBuilder)
