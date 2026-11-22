import { useState, useEffect } from 'react'
import Modal from '../../components/common/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useStore from '../../store/useStore'
import * as marketsApi from '../../services/api/markets'

export function MarketFormFields({
  countryName,
  setCountryName,
  countryCode,
  setCountryCode,
  operatorName,
  setOperatorName,
  operatorCode,
  setOperatorCode,
  autoFocus = false,
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Country name</label>
          <Input
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
            placeholder="India"
            autoFocus={autoFocus}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Country code</label>
          <Input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="IN"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Operator name</label>
          <Input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Airtel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Operator code</label>
          <Input
            value={operatorCode}
            onChange={(e) => setOperatorCode(e.target.value.toUpperCase())}
            placeholder="AIRTEL"
          />
        </div>
      </div>
      <p className="text-xs text-fg-muted">
        Tracking IDs will look like{' '}
        <code className="font-mono">
          {(countryCode || 'IN').toUpperCase()}-{(operatorCode || 'AIRTEL').toUpperCase()}-12
        </code>
      </p>
    </>
  )
}

export function CreateMarketModal({ isOpen, onClose, onCreated }) {
  const [countryName, setCountryName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [operatorCode, setOperatorCode] = useState('')
  const [creating, setCreating] = useState(false)
  const addToast = useStore((s) => s.addToast)

  const reset = () => {
    setCountryName('')
    setCountryCode('')
    setOperatorName('')
    setOperatorCode('')
  }

  const handleCreate = async () => {
    if (!countryName.trim() || !countryCode.trim() || !operatorName.trim() || !operatorCode.trim()) {
      return
    }
    setCreating(true)
    try {
      const market = await marketsApi.createMarket({
        countryName: countryName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        operatorName: operatorName.trim(),
        operatorCode: operatorCode.trim().toUpperCase(),
      })
      addToast('Market created', 'success')
      reset()
      onClose()
      onCreated?.(market)
    } catch (err) {
      addToast(err.message || 'Failed to create market', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New market" size="md">
      <div className="space-y-4">
        <MarketFormFields
          countryName={countryName}
          setCountryName={setCountryName}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          operatorName={operatorName}
          setOperatorName={setOperatorName}
          operatorCode={operatorCode}
          setOperatorCode={setOperatorCode}
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={
              creating ||
              !countryName.trim() ||
              !countryCode.trim() ||
              !operatorName.trim() ||
              !operatorCode.trim()
            }
          >
            {creating ? 'Creating...' : 'Create market'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function EditMarketModal({ isOpen, market, onClose, onUpdated }) {
  const [countryName, setCountryName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [operatorCode, setOperatorCode] = useState('')
  const [saving, setSaving] = useState(false)
  const addToast = useStore((s) => s.addToast)

  useEffect(() => {
    if (!market || !isOpen) return
    const timer = setTimeout(() => {
      setCountryName(market.countryName || '')
      setCountryCode(market.countryCode || '')
      setOperatorName(market.operatorName || '')
      setOperatorCode(market.operatorCode || '')
    }, 0)
    return () => clearTimeout(timer)
  }, [market, isOpen])

  const handleSave = async () => {
    if (!market) return
    if (!countryName.trim() || !countryCode.trim() || !operatorName.trim() || !operatorCode.trim()) {
      return
    }
    setSaving(true)
    try {
      const updated = await marketsApi.updateMarket(market.countryCode, market.operatorCode, {
        countryName: countryName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        operatorName: operatorName.trim(),
        operatorCode: operatorCode.trim().toUpperCase(),
      })
      addToast('Market updated', 'success')
      onClose()
      onUpdated?.(updated)
    } catch (err) {
      addToast(err.message || 'Failed to update market', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit market" size="md">
      <div className="space-y-4">
        <MarketFormFields
          countryName={countryName}
          setCountryName={setCountryName}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          operatorName={operatorName}
          setOperatorName={setOperatorName}
          operatorCode={operatorCode}
          setOperatorCode={setOperatorCode}
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={
              saving ||
              !countryName.trim() ||
              !countryCode.trim() ||
              !operatorName.trim() ||
              !operatorCode.trim()
            }
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
