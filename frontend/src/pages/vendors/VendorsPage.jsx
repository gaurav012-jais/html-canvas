import { memo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Power,
  Search,
  BookOpen,
} from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import useStore from '../../store/useStore'
import { VendorCreateForm } from './components/VendorCreateForm'
import { VendorCard } from './components/VendorCard'
import { EditVendorModal } from './components/EditVendorModal'

function VendorsPage() {
  const vendors = useStore((s) => s.vendors)
  const loading = useStore((s) => s.vendorsLoading)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const createVendor = useStore((s) => s.createVendor)
  const updateVendor = useStore((s) => s.updateVendor)
  const deleteVendor = useStore((s) => s.deleteVendor)

  const [vendorName, setVendorName] = useState('')
  const [vendorCode, setVendorCode] = useState('')
  const [vendorPostback, setVendorPostback] = useState('')
  const [vendorAllowedStatuses, setVendorAllowedStatuses] = useState('')
  const [creatingVendor, setCreatingVendor] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [savingUrlId, setSavingUrlId] = useState(null)
  const [search, setSearch] = useState('')
  const [editingVendor, setEditingVendor] = useState(null)

  useEffect(() => {
    fetchVendors({ force: true }).catch(() => {})
  }, [fetchVendors])

  const filtered = search.trim()
    ? vendors.filter((v) => {
        const q = search.toLowerCase()
        return v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
      })
    : vendors

  const handleCreateVendor = async (e) => {
    e.preventDefault()
    if (!vendorName.trim() || !vendorCode.trim()) return
    setCreatingVendor(true)
    try {
      await createVendor({
        name: vendorName.trim(),
        code: vendorCode.trim(),
        postbackUrl: vendorPostback.trim() || null,
        allowedCallbackStatuses: vendorAllowedStatuses.trim() || null,
      })
      setVendorName('')
      setVendorCode('')
      setVendorPostback('')
      setVendorAllowedStatuses('')
    } catch {
      // toast in slice
    } finally {
      setCreatingVendor(false)
    }
  }

  const handleToggleVendor = async (vendor) => {
    setTogglingId(vendor.id)
    try {
      await updateVendor(vendor.id, { active: vendor.active === false })
    } catch {
      // toast in slice
    } finally {
      setTogglingId(null)
    }
  }

  const handleSavePostback = async (vendorId, postbackUrl) => {
    setSavingUrlId(vendorId)
    try {
      await updateVendor(vendorId, { postbackUrl })
    } catch {
      // toast in slice
    } finally {
      setSavingUrlId(null)
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor?')) return
    try {
      await deleteVendor(vendorId)
    } catch {
      // toast in slice
    }
  }

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">Vendors</h1>
          <p className="page-header-description">
            Manage traffic partners and CPA postback URLs, then assign them on campaign
            detail pages. Statuses on a vendor are only a default — after assign, that
            campaign stores its own allow-list (same vendor can differ per campaign).
            Placeholders:{' '}
            <code className="font-mono">{'{{click_id}}'}</code>
            {' / '}
            <code className="font-mono">{'{rcid}'}</code>
            {' (both = affiliate click)'},{' '}
            <code className="font-mono">{'{{msisdn}}'}</code>,{' '}
            <code className="font-mono">{'{{campid}}'}</code> (vendor),{' '}
            <code className="font-mono">{'{{tracking_campid}}'}</code> (ours).{' '}
            <Link
              to="/docs/callbacks"
              className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
            >
              <BookOpen className="w-3.5 h-3.5" />
              How billing callbacks work
            </Link>
          </p>
        </div>

        <VendorCreateForm
          vendorName={vendorName}
          setVendorName={setVendorName}
          vendorCode={vendorCode}
          setVendorCode={setVendorCode}
          vendorPostback={vendorPostback}
          setVendorPostback={setVendorPostback}
          vendorAllowedStatuses={vendorAllowedStatuses}
          setVendorAllowedStatuses={setVendorAllowedStatuses}
          creatingVendor={creatingVendor}
          handleCreateVendor={handleCreateVendor}
        />

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted text-sm">
            Loading vendors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              title={search ? 'No vendors found' : 'No vendors yet'}
              description="Create a vendor to start assigning tracking links on campaigns"
              action={
                !search && (
                  <div className="flex justify-center">
                    <Store className="w-8 h-8 text-fg-subtle" />
                  </div>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                togglingId={togglingId}
                savingUrlId={savingUrlId}
                handleToggleVendor={handleToggleVendor}
                handleSavePostback={handleSavePostback}
                setEditingVendor={setEditingVendor}
                handleDeleteVendor={handleDeleteVendor}
              />
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-fg-subtle flex items-center gap-1.5">
          <Power className="w-3.5 h-3.5" />
          Inactive vendors stay assigned but show as inactive on campaign tracking links. CPA
          postback fires after billing callback (or confirm) when a URL is set.
        </p>
      </div>

      <EditVendorModal
        isOpen={!!editingVendor}
        vendor={editingVendor}
        onClose={() => setEditingVendor(null)}
        onSave={updateVendor}
      />
    </AppShell>
  )
}

export default memo(VendorsPage)
