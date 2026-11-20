import { memo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Button from '../../ui/Button'
import { START_NODE_ID, END_NODE_ID } from '../startConfig'

export function FlowSelectedNodeCard({
  selectedNode,
  editNode,
  removeNode,
  isLocked = false,
}) {
  if (!selectedNode || selectedNode.id === START_NODE_ID) return null

  return (
    <div className="surface-card p-3 shrink-0 border border-accent/30 bg-accent-muted/20">
      {selectedNode.id === END_NODE_ID ? (
        <>
          <p className="text-[11px] font-medium text-fg-muted mb-2">END</p>
          <p className="text-xs text-fg-muted leading-snug">
            Outcomes (Thank you, blocked, error, …) connect here. No settings — this is
            the visual finish of the funnel.
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] font-medium text-fg-muted mb-2">Selected page</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-fg">
              {selectedNode.data.label}
            </span>
            <span className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => editNode(selectedNode.data.pageType, selectedNode.data.editQuery)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNode(selectedNode.id)}
                  title="Remove from flow"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger" />
                </Button>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(FlowSelectedNodeCard)
