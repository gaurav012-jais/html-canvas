import { memo } from 'react'
import { Filter, RotateCcw, FileDown, Search, XCircle } from 'lucide-react'
import Button from '../../../components/ui/Button'
import SearchableSelect from '../../../components/ui/SearchableSelect'
import { DATE_PRESETS } from '../../../utils/date'
import { STATUS_FILTERS } from '../postbackConstants'

function PostbackFilterBar({
  dateRange,
  datePreset,
  campaignId,
  campaignOptions,
  vendorId,
  vendorOptions,
  operatorStatus,
  status,
  q,
  searchDraft,
  exporting,
  campaigns,
  vendors,
  updateDateField,
  applyDatePreset,
  setCampaignId,
  setVendorId,
  setOperatorStatus,
  setStatus,
  setSearchDraft,
  handleSearchSubmit,
  handleResetFilters,
  exportLogs,
  logsQuery,
  navigate,
  load,
}) {
  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
      {/* Main Filter Row: From, To, Offer Dropdown, Vendor Dropdown, and Filter Button */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* From Date */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-from-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            From:
          </label>
          <input
            id="filter-from-date"
            type="date"
            value={dateRange.from || ''}
            onChange={(e) => updateDateField('from', e.target.value)}
            className="h-[38px] border border-gray-300 rounded-md px-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-colors"
          />
        </div>

        {/* To Date */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-to-date" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            To:
          </label>
          <input
            id="filter-to-date"
            type="date"
            value={dateRange.to || ''}
            onChange={(e) => updateDateField('to', e.target.value)}
            className="h-[38px] border border-gray-300 rounded-md px-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-colors"
          />
        </div>

        {/* Campaign / Offer Searchable Dropdown */}
        <div className="w-56 min-w-[190px]">
          <SearchableSelect
            value={campaignId}
            onChange={setCampaignId}
            options={campaignOptions}
            placeholder="All offers / campaigns"
            allOptionLabel="All offers / campaigns"
            searchPlaceholder="Search campaign..."
          />
        </div>

        {/* Vendor Searchable Dropdown */}
        <div className="w-48 min-w-[160px]">
          <SearchableSelect
            value={vendorId}
            onChange={setVendorId}
            options={vendorOptions}
            placeholder="All Vendors"
            allOptionLabel="All Vendors"
            searchPlaceholder="Search vendor..."
          />
        </div>

        {/* Filter Button */}
        <button
          type="button"
          onClick={load}
          className="h-[38px] bg-blue-600 text-white font-medium px-6 rounded-md shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer transition-none shrink-0"
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>

        {/* Reset Button */}
        {(campaignId || vendorId || operatorStatus || q || datePreset !== 'today') && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-[38px] text-gray-500 text-xs sm:text-sm px-3.5 border border-gray-200 rounded-md cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Secondary Controls Bar: Presets on left, Export logs on right */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-medium text-gray-400 mr-1">Quick:</span>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyDatePreset(preset.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={exportLogs}
            disabled={exporting || !dateRange.from || !dateRange.to}
          >
            <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export logs'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(logsQuery())}>
            View detailed logs
          </Button>
        </div>
      </div>

      {/* Status Tabs and Search Input Row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                status === f.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}

          {campaignId ? (
            <button
              type="button"
              onClick={() => setCampaignId('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                Clear offer:{' '}
                {campaigns.find((c) => String(c.id) === String(campaignId))?.name || `#${campaignId}`}
              </span>
              <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
            </button>
          ) : null}

          {vendorId ? (
            <button
              type="button"
              onClick={() => setVendorId('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                Clear vendor:{' '}
                {vendors.find((v) => String(v.id) === String(vendorId))?.name || `#${vendorId}`}
              </span>
              <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
            </button>
          ) : null}

          {operatorStatus ? (
            <button
              type="button"
              onClick={() => setOperatorStatus('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Clear operator status: {operatorStatus}</span>
              <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
            </button>
          ) : null}
        </div>

        <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              className="h-[36px] pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-white w-60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="msisdn / click / rcid / camp / offer"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-[36px]">
            Search
          </Button>
        </form>
      </div>
    </div>
  )
}

export default memo(PostbackFilterBar)
