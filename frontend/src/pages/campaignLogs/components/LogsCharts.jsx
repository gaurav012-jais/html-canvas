import { memo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { SectionCard, CustomTooltip } from './LogCards'
import { PIE_COLORS, eventLabel, statusLabel } from '../logConstants'
import { formatChartLabel } from '../../../utils/date'
import { LogsFunnelCompare } from './LogsFunnelCompare'
import { LogsKpiStats } from './LogsKpiStats'

export function LogsCharts({
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
  totalEvents,
  logsTotal,
  aggs,
  selectedId,
  otpStats,
  timeSeriesData,
  eventsByTypeData,
  chartEventCategory,
  setChartEventCategory,
  currentFlowSpec,
  flowType,
  statusDistributionData,
  getVendorLabel,
}) {
  return (
    <>
      <LogsFunnelCompare
        datePreset={datePreset}
        isHourly={isHourly}
        activePresets={activePresets}
        compareEvents={compareEvents}
        setCompareEvents={setCompareEvents}
        selectedSeries={selectedSeries}
        toggleCompareEvent={toggleCompareEvent}
        eventTypeOptions={eventTypeOptions}
        funnelTotals={funnelTotals}
        compareRatio={compareRatio}
        compareRatioHint={compareRatioHint}
        funnelCompareData={funnelCompareData}
        funnelBarData={funnelBarData}
      />

      <LogsKpiStats
        totalEvents={totalEvents}
        logsTotal={logsTotal}
        aggs={aggs}
        selectedId={selectedId}
        otpStats={otpStats}
      />

      {/* Charts Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title={isHourly ? 'Events over time (by hour)' : 'Events over time'}>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area type="monotone" name="Events Count" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#evGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Events by type"
          actions={
            currentFlowSpec ? (
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setChartEventCategory('funnel')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartEventCategory === 'funnel'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Funnel Events
                </button>
                <button
                  type="button"
                  onClick={() => setChartEventCategory('api')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartEventCategory === 'api'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  API &amp; System Events
                </button>
              </div>
            ) : null
          }
        >
          {eventsByTypeData.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">No {chartEventCategory} events found for this filter.</p>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={eventsByTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="key"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(v) => eventLabel(v, flowType)}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Status distribution">
          <div style={{ width: '100%', height: 260 }}>
            {statusDistributionData.length === 0 ? (
              <p className="text-sm text-gray-400 py-16 text-center">No status data</p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="key"
                    label={({ key, percent }) => `${statusLabel(key, flowType)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Vendor Breakdown">
          {(aggs?.byVendor || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">No vendor breakdown data</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {(aggs.byVendor || []).map((v, i) => {
                const pctVal = totalEvents ? Math.round((v.count / totalEvents) * 100) : 0
                return (
                  <div key={v.key || i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium truncate max-w-[200px]">
                      {getVendorLabel(v.key)}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pctVal}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-900 w-12 text-right">
                        {v.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}

export default memo(LogsCharts)
