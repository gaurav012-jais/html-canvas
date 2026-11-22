import { memo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Save, Lock, Unlock } from 'lucide-react'
import Button from '../ui/Button'
import FlowCampaignSettings from './FlowCampaignSettings'
import {
  nodeTypes,
  orangeBfPageLabel,
  orangeBfPageSubtitle,
} from './builder/builderUtils'
import FlowModeConfigCard from './builder/FlowModeConfigCard'
import FlowSelectedNodeCard from './builder/FlowSelectedNodeCard'
import FlowStartChecksCard from './builder/FlowStartChecksCard'
import FlowConnectionsCard from './builder/FlowConnectionsCard'
import FlowPagesCard from './builder/FlowPagesCard'
import { useFlowBuilderState } from './builder/useFlowBuilderState'

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
  const {
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
    newConnConditionOptions,
    showApiExpose,
    setIsLocked,
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
  } = useFlowBuilderState({
    campaignId,
    countryCode,
    operatorCode,
  })

  const nodeLabel = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node ? node.data.label : nodeId
  }

  const canvasHeight = embeddedStudio ? '480px' : embedded ? '500px' : '520px'

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
