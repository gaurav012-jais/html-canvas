import { useEffect, useState } from 'react'
import Modal from '../../../components/common/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import AllowedCallbackStatusesField, {
  GLOBAL_CALLBACK_STATUSES,
} from '../../../components/partners/AllowedCallbackStatusesField'

export function EditVendorModal({ isOpen, vendor, onClose, onSave }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [allowedStatuses, setAllowedStatuses] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!vendor || !isOpen) return
    const timer = setTimeout(() => {
      setName(vendor.name || '')
      setCode(vendor.code || '')
      setAllowedStatuses(vendor.allowedCallbackStatuses || '')
    }, 0)
    return () => clearTimeout(timer)
  }, [vendor, isOpen])

  const handleSave = async () => {
    if (!vendor || !name.trim() || !code.trim()) return
    setSaving(true)
    try {
      await onSave(vendor.id, {
        name: name.trim(),
        code: code.trim(),
        allowedCallbackStatuses: allowedStatuses.trim() || null,
      })
      onClose()
    } catch {
      // toast in slice
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit vendor" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Vendor name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vendor name"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Code</label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="font-mono"
          />
        </div>
        <div>
          <AllowedCallbackStatusesField
            value={allowedStatuses}
            onChange={(next) => setAllowedStatuses(next || '')}
            disabled={saving}
            label="Allowed Callback Statuses"
            hint={`Default for new campaign assignments only. Each campaign stores its own list after you assign this vendor. Blank uses global (${GLOBAL_CALLBACK_STATUSES}).`}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !name.trim() || !code.trim()}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
