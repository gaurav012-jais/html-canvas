import { memo } from 'react'
import { Filter, Calendar, Search } from 'lucide-react'
import { LOGS_DATE_PRESETS, eventLabel, statusLabel, isForeignFlowEvent } from '../logConstants'
import { formatChartLabel } from '../../../utils/date'

export function LogsFilterBar({
  datePreset,
  applyDatePreset,
  timezone,
  isHourly,
  filters,
  updateFilter,
  selectedId,
  setSelectedId,
  campaigns,
  vendors,
  currentFlowSpec,
  flowType,
  eventTypeOptions,
  statusOptions,
  onResetPage,
}) {
  return (
    <div className="bg-white border border-gray-100 shadow-2xs rounded-2xl p-5 mb-8">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5" />
        Query Filters
      </h3>

      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 mb-1.5">Date Range</label>
        <div className="flex flex-wrap gap-2">
          {LOGS_DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyDatePreset(preset.id)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                datePreset === preset.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-gray-50/60 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {datePreset === 'all' ? (
          <p className="mt-2 text-[11px] text-gray-400 font-medium">
            Showing all time · daily
            {timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta' ? ' · IST' : timezone ? ` · ${timezone}` : ''}
          </p>
        ) : datePreset !== 'custom' && filters.from && filters.to ? (
          <p className="mt-2 text-[11px] text-gray-400 font-medium">
            Showing {formatChartLabel(filters.from)} → {formatChartLabel(filters.to)}
            {isHourly ? ' · hourly' : ' · daily'}
            {timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta' ? ' · IST' : timezone ? ` · ${timezone}` : ''}
          </p>
        ) : null}
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
          datePreset === 'custom' ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
        }`}
      >
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Campaign Node</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
            value={selectedId}
            onChange={(e) => {
              onResetPage()
              setSelectedId(e.target.value)
            }}
          >
            <option value="all">— All Campaigns —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.trackingId || `${c.country} / ${c.operator}`} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center justify-between">
            <span>Event Type</span>
            {currentFlowSpec && (
              <span className="text-[10px] text-indigo-600 font-semibold">{currentFlowSpec.label}</span>
            )}
          </label>
          <select
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
            value={filters.eventType}
            onChange={(e) => updateFilter('eventType', e.target.value)}
          >
            <option value="">— All Event Types —</option>
            {currentFlowSpec ? (
              <>
                <optgroup label="Screens & Funnel Steps">
                  {currentFlowSpec.funnelEvents
                    .filter((t) => eventTypeOptions.includes(t))
                    .map((type) => (
                      <option key={type} value={type}>
                        {eventLabel(type)}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="API & Background Events">
                  {eventTypeOptions
                    .filter(
                      (t) =>
                        !currentFlowSpec.funnelEvents.includes(t) &&
                        (currentFlowSpec.apiEvents.includes(t) || !isForeignFlowEvent(t, flowType))
                    )
                    .map((type) => (
                      <option key={type} value={type}>
                        {eventLabel(type)}
                      </option>
                    ))}
                </optgroup>
              </>
            ) : (
              eventTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {eventLabel(type)} ({type})
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Verification Status</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">— All Statuses —</option>
            {statusOptions.map((st) => (
              <option key={st} value={st}>
                {statusLabel(st, flowType)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Vendor</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
            value={filters.vendorId}
            onChange={(e) => updateFilter('vendorId', e.target.value)}
          >
            <option value="">— All Vendors —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </div>

        {datePreset === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">From Date</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  value={filters.from}
                  onChange={(e) => updateFilter('from', e.target.value)}
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">To Date</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                  value={filters.to}
                  onChange={(e) => updateFilter('to', e.target.value)}
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Global Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
              placeholder="Click ID, RCID, phone..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(LogsFilterBar)
