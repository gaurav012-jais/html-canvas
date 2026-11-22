import { Users, Link2, Pencil, Trash2 } from 'lucide-react'
import { ActiveSwitch } from './ActiveSwitch'
import { PostbackUrlField } from './PostbackUrlField'

export function VendorCard({
  vendor,
  togglingId,
  savingUrlId,
  handleToggleVendor,
  handleSavePostback,
  setEditingVendor,
  handleDeleteVendor,
}) {
  const isActive = vendor.active !== false

  return (
    <div
      className={`surface-card overflow-hidden transition-opacity ${
        isActive ? '' : 'opacity-75'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isActive ? 'bg-accent-muted text-accent' : 'bg-bg-muted text-fg-subtle'
          }`}
        >
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-fg truncate">{vendor.name}</p>
            <span className={`badge ${isActive ? 'badge-success' : 'badge-muted'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            {vendor.postbackUrl ? (
              <span className="badge badge-muted flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Postback
              </span>
            ) : null}
            {vendor.allowedCallbackStatuses ? (
              <span
                className="badge badge-subtle flex items-center gap-1 font-mono text-[10px]"
                title="Allowed callback statuses"
              >
                Default: {vendor.allowedCallbackStatuses}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            <code className="font-mono">{vendor.code}</code>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2" title={isActive ? 'Deactivate' : 'Activate'}>
            <span className="hidden sm:inline text-[11px] text-fg-subtle">
              {isActive ? 'On' : 'Off'}
            </span>
            <ActiveSwitch
              active={isActive}
              label={isActive ? `Deactivate ${vendor.name}` : `Activate ${vendor.name}`}
              disabled={togglingId === vendor.id}
              onToggle={() => handleToggleVendor(vendor)}
            />
          </div>
          <button
            type="button"
            className="p-1.5 text-fg-muted hover:text-accent rounded-md hover:bg-accent-muted transition-colors"
            title="Edit vendor"
            onClick={() => setEditingVendor(vendor)}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 text-fg-muted hover:text-danger rounded-md hover:bg-danger-muted transition-colors"
            title="Delete vendor"
            onClick={() => handleDeleteVendor(vendor.id)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 bg-bg-muted/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle mb-1.5 flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" />
          Postback URL
        </p>
        <PostbackUrlField
          value={vendor.postbackUrl}
          saving={savingUrlId === vendor.id}
          placeholder="https://partner.com/postback?click_id={{click_id}}&msisdn={{msisdn}}"
          onSave={(url) => handleSavePostback(vendor.id, url)}
        />
      </div>
    </div>
  )
}
