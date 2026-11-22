import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/common/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useStore from '../../store/useStore'
import * as marketsApi from '../../services/api/markets'
import * as campaignsApi from '../../services/api/campaigns'
import { campaignDetailPath } from '../../utils/routes'

export function CreateMarketCampaignModal({
  isOpen,
  onClose,
  countryCode,
  operatorCode,
  countryName,
  operatorName,
  campaigns = [],
  onCreated,
}) {
  const [name, setName] = useState('')
  const [copyFromCampaignId, setCopyFromCampaignId] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)

  const handleCreate = async () => {
    const campaignName = name.trim() || `${countryName} ${operatorName}`
    setCreating(true)
    try {
      const campaign = await marketsApi.createMarketCampaign(countryCode, operatorCode, {
        name: campaignName,
        copyFromCampaignId: copyFromCampaignId ? Number(copyFromCampaignId) : undefined,
      })
      addToast('Campaign created', 'success')
      setName('')
      setCopyFromCampaignId('')
      onClose()
      onCreated?.(campaign)
      navigate(campaignDetailPath(countryCode, operatorCode, campaign.id))
    } catch (err) {
      addToast(err.message || 'Failed to create campaign', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New campaign" size="md">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Creating under{' '}
          <span className="font-medium text-fg">
            {countryName} / {operatorName}
          </span>
        </p>
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Campaign name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wellness WAP"
            autoFocus
          />
        </div>
        {campaigns.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">Copy pages from</label>
            <select
              className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg"
              value={copyFromCampaignId}
              onChange={(e) => setCopyFromCampaignId(e.target.value)}
            >
              <option value="">Start blank</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.trackingId ? ` (${c.trackingId})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function EditCampaignModal({ isOpen, campaign, onClose, onUpdated }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const addToast = useStore((s) => s.addToast)

  useEffect(() => {
    if (!campaign || !isOpen) return
    const timer = setTimeout(() => {
      setName(campaign.name || '')
    }, 0)
    return () => clearTimeout(timer)
  }, [campaign, isOpen])

  const handleSave = async () => {
    if (!campaign || !name.trim()) return
    setSaving(true)
    try {
      const updated = await campaignsApi.updateCampaign(campaign.id, {
        name: name.trim(),
      })
      addToast('Campaign updated', 'success')
      onClose()
      onUpdated?.(updated)
    } catch (err) {
      addToast(err.message || 'Failed to update campaign', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit campaign" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">Campaign name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wellness WAP"
            autoFocus
          />
        </div>
        {campaign?.trackingId && (
          <p className="text-xs text-fg-muted">
            Tracking ID{' '}
            <code className="font-mono">{campaign.trackingId}</code> stays the same.
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
