import { memo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import Button from '../../ui/Button'
import { PAGE_TYPE_LABELS } from '../../../services/api/campaigns'
import { PAGE_TYPES, orangeBfPageLabel } from './builderUtils'

export function FlowPagesCard({
  pageNodes,
  existingPageTypes,
  selectedNodeId,
  setSelectedNodeId,
  editNode,
  addNode,
  mode,
  isLocked = false,
}) {
  return (
    <div className="surface-card p-3 shrink-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-fg">Pages</h3>
        <span className="text-[11px] text-fg-muted">{pageNodes.length} in flow</span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {pageNodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setSelectedNodeId(n.id)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
              selectedNodeId === n.id
                ? 'border-accent bg-accent-muted text-fg font-medium'
                : 'border-border bg-bg-subtle text-fg-muted hover:border-fg-muted'
            }`}
          >
            {n.data.label}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                editNode(n.data.pageType, n.data.editQuery)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  editNode(n.data.pageType, n.data.editQuery)
                }
              }}
              className="p-0.5 rounded hover:bg-bg-muted"
              title="Edit"
            >
              <Pencil className="w-3 h-3" />
            </span>
          </button>
        ))}
        {pageNodes.length === 0 && <p className="text-xs text-fg-muted">No pages yet.</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
        {PAGE_TYPES.filter((pt) => !existingPageTypes.has(pt)).map((pt) => (
          <Button
            key={pt}
            variant="outline"
            size="sm"
            disabled={isLocked}
            onClick={() => addNode(pt)}
          >
            <Plus className="w-3 h-3" />
            {mode === 'ORANGE_BF' ? orangeBfPageLabel(pt) : PAGE_TYPE_LABELS[pt] || pt}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default memo(FlowPagesCard)
