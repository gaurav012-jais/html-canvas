import { memo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { BarChart3, ChevronRight } from 'lucide-react'
import { CustomTooltip } from '../dashboardConstants'

export function TrafficTrendChart({ loading, timeSeriesData }) {
  return (
    <div className="lg:col-span-2 bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-accent rounded-full" />
            <h2 className="text-sm font-bold text-fg">Visits by day</h2>
          </div>
          <p className="text-[11px] text-fg-muted mt-1">
            Same Visits KPI — today from raw tables, past days from dump
          </p>
        </div>
        <Link
          to="/postbacks/day-logs"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
        >
          View Full Logs <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-5 flex-1 min-h-[300px]">
        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-fg-muted animate-pulse">
            Loading trend data...
          </div>
        ) : timeSeriesData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center p-6">
            <BarChart3 className="w-8 h-8 text-fg-muted/40 mb-2" />
            <p className="text-xs text-fg-muted">No traffic data recorded for this date range.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeSeriesData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                minTickGap={28}
                height={36}
                tickMargin={8}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                width={36}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip hourly={false} />} />
              <Area
                type="monotone"
                dataKey="Visits"
                name="Visits"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#trafficGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default memo(TrafficTrendChart)
