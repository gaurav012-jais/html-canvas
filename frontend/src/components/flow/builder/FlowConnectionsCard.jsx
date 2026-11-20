import { memo } from 'react'
import { Link2, Trash2 } from 'lucide-react'
import Button from '../../ui/Button'
import { conditionLabel } from '../flowConditions'

export function FlowConnectionsCard({
  pageNodes,
  edges,
  newConnSource,
  setNewConnSource,
  newConnTarget,
  setNewConnTarget,
  newConnCondition,
  setNewConnCondition,
  newConnConditionOptions,
  addConnection,
  removeEdge,
  setEdgeCondition,
  getEdgeConditionOptions,
  nodeLabel,
  isLocked = false,
}) {
  return (
    <div className="surface-card p-4 flex flex-col shrink-0">
      <h3 className="text-sm font-semibold text-fg mb-1">Connections</h3>
      <p className="text-xs text-fg-muted mb-3">
        Set flow paths here. Drag nodes only to reposition.
      </p>

      <div
        className={`rounded-lg border border-accent/40 bg-accent-muted/30 p-3 mb-3 space-y-2 ${
          isLocked ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <p className="text-xs font-medium text-fg">Add connection</p>
        <label className="block">
          <span className="text-[11px] text-fg-muted">From</span>
          <select
            className="mt-0.5 w-full text-xs border border-border rounded-md px-2 py-1.5 bg-bg-base"
            value={newConnSource}
            disabled={isLocked}
            onChange={(ev) => setNewConnSource(ev.target.value)}
          >
            <option value="">Select page...</option>
            {pageNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.data.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-fg-muted">To</span>
          <select
            className="mt-0.5 w-full text-xs border border-border rounded-md px-2 py-1.5 bg-bg-base"
            value={newConnTarget}
            disabled={isLocked}
            onChange={(ev) => setNewConnTarget(ev.target.value)}
          >
            <option value="">Select page...</option>
            {pageNodes
              .filter((n) => n.id !== newConnSource)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data.label}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-fg-muted">When</span>
          <select
            className="mt-0.5 w-full text-xs border border-border rounded-md px-2 py-1.5 bg-bg-base"
            value={newConnCondition}
            disabled={isLocked || !newConnSource}
            onChange={(ev) => setNewConnCondition(ev.target.value)}
          >
            {newConnConditionOptions.map((c) => (
              <option key={c} value={c}>
                {conditionLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={addConnection}
          disabled={isLocked || !newConnSource || !newConnTarget}
        >
          <Link2 className="w-3.5 h-3.5" />
          Add connection
        </Button>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2 pr-0.5">
        {edges.map((e) => (
          <div key={e.id} className="rounded-lg border border-border p-2">
            <div className="flex items-center justify-between text-xs text-fg-muted mb-1.5">
              <span>
                {nodeLabel(e.source)} → {nodeLabel(e.target)}
              </span>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeEdge(e.id)}
                  className="text-danger hover:opacity-70 cursor-pointer"
                  title="Delete connection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              className="w-full text-xs border border-border rounded-md px-2 py-1 bg-bg-base"
              value={e.data?.condition || 'DEFAULT'}
              disabled={isLocked}
              onChange={(ev) => setEdgeCondition(e.id, ev.target.value)}
            >
              {getEdgeConditionOptions(e.source, e.data?.condition).map((c) => (
                <option key={c} value={c}>
                  {conditionLabel(c)}
                </option>
              ))}
            </select>
          </div>
        ))}
        {edges.length === 0 && (
          <p className="text-xs text-fg-muted">
            No connections yet. Use the form above or blue dot → green dot on canvas.
          </p>
        )}
      </div>
    </div>
  )
}

export default memo(FlowConnectionsCard)
