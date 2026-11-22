import { Plus } from 'lucide-react'
import Button from '../../../components/ui/Button'
import AllowedCallbackStatusesField, {
  GLOBAL_CALLBACK_STATUSES,
} from '../../../components/partners/AllowedCallbackStatusesField'

export function VendorCreateForm({
  vendorName,
  setVendorName,
  vendorCode,
  setVendorCode,
  vendorPostback,
  setVendorPostback,
  vendorAllowedStatuses,
  setVendorAllowedStatuses,
  creatingVendor,
  handleCreateVendor,
}) {
  return (
    <div className="surface-card p-5 mb-6">
      <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add vendor
      </h2>
      <form onSubmit={handleCreateVendor} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg"
            placeholder="Vendor name"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
          />
          <input
            className="sm:w-40 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
            placeholder="Code"
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
          />
          <Button type="submit" variant="primary" size="sm" disabled={creatingVendor}>
            {creatingVendor ? 'Creating...' : 'Create'}
          </Button>
        </div>
        <input
          className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
          placeholder="Postback URL (optional) — https://partner.com/pb?click={{click_id}}&msisdn={{msisdn}}"
          value={vendorPostback}
          onChange={(e) => setVendorPostback(e.target.value)}
        />
        <AllowedCallbackStatusesField
          compact
          value={vendorAllowedStatuses}
          onChange={(next) => setVendorAllowedStatuses(next || '')}
          disabled={creatingVendor}
          label="Default for new assignments"
          hint={`Copied onto a campaign when you assign this vendor. Change it later on that campaign without affecting others. Blank uses global: ${GLOBAL_CALLBACK_STATUSES}.`}
        />
      </form>
    </div>
  )
}
