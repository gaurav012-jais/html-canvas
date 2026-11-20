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
  Legend,
} from 'recharts'
import {
  Activity,
  Users,
  UserCheck,
  Percent,
  KeyRound,
  Shield,
  Database,
} from 'lucide-react'
import { SectionCard, StatCard, CustomTooltip } from './LogCards'
import { PIE_COLORS, MAX_COMPARE_EVENTS, eventLabel, statusLabel } from '../logConstants'
import { formatChartLabel } from '../../../utils/date'

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
      <SectionCard
        className="mb-4"
        title="Compare events"
        actions={
          <span className="text-[11px] text-gray-400 font-medium">
            Pick 2–4 events · {datePreset === 'all' ? 'all time' : 'selected dates'}
          </span>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          {activePresets.map((preset) => {
            const active =
              preset.events.length === compareEvents.length &&
              preset.events.every((e, i) => e === compareEvents[i])
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCompareEvents(preset.events)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedSeries.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleCompareEvent(s.key)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
              style={{ background: s.color }}
              title="Remove from graph"
            >
              {s.label}
              <span className="opacity-80">×</span>
            </button>
          ))}
          {compareEvents.length < MAX_COMPARE_EVENTS ? (
            <select
              className="text-[11px] font-semibold border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
              value=""
              onChange={(e) => {
                const next = e.target.value
                if (next) toggleCompareEvent(next)
              }}
            >
              <option value="">+ Add event</option>
              {eventTypeOptions
                .filter((type) => !compareEvents.includes(type))
                .map((type) => (
                  <option key={type} value={type}>
                    {eventLabel(type)}
                  </option>
                ))}
            </select>
          ) : (
            <span className="text-[11px] text-gray-400">Max {MAX_COMPARE_EVENTS} events</span>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {selectedSeries.map((s) => (
          <StatCard
            key={s.key}
            label={s.label}
            value={Number(funnelTotals[s.key]) || 0}
            icon={s.key.includes('VISIT') ? Database : s.key.includes('CG') ? Activity : Users}
            colorClass="from-indigo-500 to-blue-500"
          />
        ))}
        {compareEvents.length >= 2 ? (
          <StatCard
            label={`${eventLabel(compareEvents[compareEvents.length - 1])} / ${eventLabel(compareEvents[0])}`}
            value={compareRatio}
            hint={compareRatioHint}
            icon={Percent}
            colorClass="from-indigo-500 to-purple-500"
          />
        ) : null}
      </div>

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

      {/* KPI Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Event Count" value={totalEvents} icon={Activity} colorClass="from-indigo-500 to-purple-500" />
        <StatCard label="Clicks in filter" value={logsTotal || 0} icon={Database} colorClass="from-blue-500 to-indigo-500" />
        <StatCard label="Unique Vendors" value={(aggs?.byVendor || []).length} icon={Users} colorClass="from-teal-500 to-emerald-500" />
        <StatCard label="Campaigns in view" value={selectedId === 'all' ? (aggs?.byCampaign || []).length || '—' : 1} icon={UserCheck} colorClass="from-amber-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="OTP requested"
          value={otpStats.requested}
          hint="Successful send"
          icon={KeyRound}
          colorClass="from-amber-500 to-orange-500"
        />
        <StatCard
          label="OTP verified"
          value={otpStats.verifiedLive}
          hint={`${otpStats.verifiedVendor} shown to vendor`}
          icon={KeyRound}
          colorClass="from-violet-500 to-indigo-500"
        />
        <StatCard
          label="Live conv %"
          value={`${otpStats.liveConvPercent}%`}
          hint="Verified / requested"
          icon={Percent}
          colorClass="from-emerald-500 to-teal-500"
        />
        <StatCard
          label="Vendor conv %"
          value={`${otpStats.vendorConvPercent}%`}
          hint="After hold, what vendor sees"
          icon={Percent}
          colorClass="from-sky-500 to-blue-500"
        />
        <StatCard
          label="Hold %"
          value={`${otpStats.holdPercent}%`}
          hint={`${otpStats.held} held of live verifies`}
          icon={Shield}
          colorClass="from-rose-500 to-orange-500"
        />
      </div>

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
                  Screen Funnel
                </button>
                <button
                  type="button"
                  onClick={() => setChartEventCategory('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartEventCategory === 'all'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  All Events
                </button>
              </div>
            ) : null
          }
        >
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={eventsByTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="key"
                  stroke="#94a3b8"
                  tick={{ fontSize: 9, fontWeight: 500 }}
                  tickFormatter={(v) => eventLabel(v, flowType)}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const row = payload[0]?.payload
                      return (
                        <div className="rounded-xl border border-gray-800 bg-gray-900/95 p-3 text-white shadow-xl backdrop-blur-md">
                          <p className="text-[10px] font-semibold text-gray-300">
                            {eventLabel(row.key, flowType)}
                          </p>
                          <p className="text-xs font-bold mt-1 text-indigo-300">
                            Count: <span className="font-mono text-white">{row.count}</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" name="Frequency" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Verification Status Distribution">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusDistributionData}
                  dataKey="count"
                  nameKey="key"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusDistributionData.map((entry, i) => (
                    <Cell key={entry.key} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, statusLabel(name, flowType)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Vendor Traffic Volumes">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={aggs?.byVendor || []} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 500 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="key"
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fontWeight: 500 }}
                  width={110}
                  tickFormatter={getVendorLabel}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Total Events" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </>
  )
}

export default memo(LogsCharts)
