import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../../../components/common/Modal'
import Button from '../../../components/ui/Button'

function ConfirmPurgeModal({
  confirmModal,
  onClose,
  onConfirm,
  purgingScope,
}) {
  return (
    <Modal
      isOpen={confirmModal.isOpen}
      onClose={onClose}
      title={confirmModal.title}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">{confirmModal.description}</p>
            {confirmModal.pattern && (
              <p className="font-mono text-[11px] text-danger/80">
                Pattern: {confirmModal.pattern}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-fg-muted">
          Active users or live traffic on these paths will re-query the primary PostgreSQL database,
          temporarily increasing response latencies.
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={Boolean(purgingScope)}
          >
            {purgingScope ? 'Purging…' : 'Confirm & Purge'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(ConfirmPurgeModal)
