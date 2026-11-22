import { memo } from 'react'
import { Calendar, Filter, FileDown, FileText } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { DATE_PRESETS, formatChartLabel, formatDate } from '../../../utils/date'
import { GROUP_BY, SELECT_CLASS } from '../dayLogConstants'

function DayLogsFilterBar({
  datePreset,
  dateRange,
  timezone,
  generatedAt,
  campaignId,
  campaigns,
  vendorId,
  vendors,
  groupBy,
  exporting,
  loading,
  applyDatePreset,
  updateDateField,
  applyCampaign,
  applyVendor,
  applyGroupBy,
  exportLogs,
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5" />
        Date range & filters
      </h3>
      <div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
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
        {datePreset !== 'custom' && dateRange.from && dateRange.to ? (
          <p className="mt-2 text-[11px] text-gray-400 font-medium">
            Showing {formatChartLabel(dateRange.from)} → {formatChartLabel(dateRange.to)}
            {timezone ? ` · ${timezone === 'Asia/Kolkata' ? 'IST' : timezone}` : ''}
            {generatedAt ? ` · generated ${formatDate(generatedAt)}` : ''}
          </p>
        ) : null}
      </div>

      {datePreset === 'custom' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">From Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                value={dateRange.from}
                onChange={(e) => updateDateField('from', e.target.value)}
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">To Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                value={dateRange.to}
                onChange={(e) => updateDateField('to', e.target.value)}
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Campaign</label>
          <select
            className={SELECT_CLASS}
            value={campaignId}
            onChange={(e) => applyCampaign(e.target.value)}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.trackingId || `${c.country} / ${c.operator}`} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Vendor</label>
          <select
            className={SELECT_CLASS}
            value={vendorId}
            onChange={(e) => applyVendor(e.target.value)}
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}{v.code ? ` (${v.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Breakdown</label>
          <select
            className={SELECT_CLASS}
            value={groupBy}
            onChange={(e) => applyGroupBy(e.target.value)}
          >
            {GROUP_BY.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => exportLogs('csv')}
          disabled={exporting || loading || !dateRange.from || !dateRange.to}
        >
          <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
          {exporting ? 'Exporting…' : 'Export logs'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportLogs('txt')}
          disabled={exporting || loading || !dateRange.from || !dateRange.to}
        >
          <FileText className="w-4 h-4" />
          Export TXT
        </Button>
      </div>
    </div>
  )
}

export default memo(DayLogsFilterBar)
