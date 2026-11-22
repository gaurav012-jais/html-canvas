import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { SectionCard, CustomTooltip } from './LogCards'
import { MAX_COMPARE_EVENTS } from '../logConstants'
import { formatChartLabel } from '../../../utils/date'

export function LogsFunnelCompare({
  datePreset,
  isHourly,
  activePresets,
  compareEvents,
  setCompareEvents,
  selectedSeries,
  toggleCompareEvent,
  eventTypeOptions,
  funnelTotals,
  compareRatio,
  compareRatioHint,
  funnelCompareData,
  funnelBarData,
}) {
  return (
    <>
      <SectionCard
        title="Compare Funnel Steps (Live traffic vs completions)"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-400 mr-1 uppercase tracking-wider">Presets:</span>
            {activePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCompareEvents(preset.events)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                  JSON.stringify(compareEvents) === JSON.stringify(preset.events)
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-gray-500 font-medium mr-1">
              Active series ({compareEvents.length}/{MAX_COMPARE_EVENTS}):
            </span>
            {selectedSeries.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleCompareEvent(s.key)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: s.color }}
                title="Click to remove from compare"
              >
                <span>{s.label}</span>
                <span className="text-white/80 hover:text-white font-bold ml-0.5">×</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400 mr-2 uppercase tracking-wider">Add event:</span>
            {eventTypeOptions
              .filter((opt) => !compareEvents.includes(opt.id))
              .map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleCompareEvent(opt.id)}
                  disabled={compareEvents.length >= MAX_COMPARE_EVENTS}
                  className="text-xs px-2 py-0.5 rounded border border-dashed border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-600 transition-colors"
                >
                  + {opt.label}
                </button>
              ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {funnelTotals.map((item) => (
              <div key={item.key} className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                <div className="text-[11px] font-medium text-gray-500 truncate" title={item.label}>
                  {item.label}
                </div>
                <div className="text-xl font-bold text-gray-900 mt-1">{item.total.toLocaleString()}</div>
                {item.conversionFromFirst != null && (
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {item.conversionFromFirst}% of {funnelTotals[0]?.label}
                  </div>
                )}
              </div>
            ))}
            {compareRatio && (
              <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100 col-span-2 sm:col-span-1">
                <div className="text-[11px] font-semibold text-indigo-700">Funnel Conversion</div>
                <div className="text-xl font-extrabold text-indigo-900 mt-1">{compareRatio}</div>
                <div className="text-[11px] text-indigo-600 mt-0.5 truncate" title={compareRatioHint}>
                  {compareRatioHint}
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard
          title={
            datePreset === 'all'
              ? `${selectedSeries.map((s) => s.label).join(' vs ')} (all time)`
              : isHourly
                ? `${selectedSeries.map((s) => s.label).join(' vs ')} (by hour)`
                : `${selectedSeries.map((s) => s.label).join(' vs ')} (by day)`
          }
        >
          {funnelCompareData.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">No events in this range for the selected types.</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <AreaChart data={funnelCompareData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="key"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, fontWeight: 500 }}
                    tickFormatter={(v) => formatChartLabel(v, { hourly: isHourly })}
                    interval={isHourly ? 'preserveStartEnd' : 0}
                    minTickGap={isHourly ? 28 : 8}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip hourly={isHourly} />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  {selectedSeries.map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      name={s.label}
                      dataKey={s.key}
                      stroke={s.color}
                      fill={s.color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title={datePreset === 'all' ? 'Totals (all time)' : 'Totals (selected range)'}>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={funnelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="key" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                  {funnelBarData.map((row) => (
                    <Cell key={row.key} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </>
  )
}
