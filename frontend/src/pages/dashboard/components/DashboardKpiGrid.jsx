import { memo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Globe,
  FolderKanban,
  Store,
  ArrowUpRight,
} from 'lucide-react'

export function DashboardKpiGrid({
  loading,
  totalVisits,
  totalConversions,
  conversionRate,
  filteredMarketsCount,
  activeCampaignsCount,
  filteredCampaignsCount,
  vendorsCount,
  buildAnalyticsUrl,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Card 1: Total Traffic */}
      <Link
        to="/postbacks/day-logs"
        className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-accent/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Visits</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-fg tracking-tight">
            {loading ? '...' : totalVisits.toLocaleString()}
          </p>
          <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
            <span>Today live · older days from dump</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </Link>

      {/* Card 2: Conversions */}
      <Link
        to={buildAnalyticsUrl()}
        className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-500/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Conversions</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-fg tracking-tight">
            {loading ? '...' : totalConversions.toLocaleString()}
          </p>
          <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
            <span>Per-flow total (CG callback, OTP payout, subscribe)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </Link>

      {/* Card 3: Conversion Rate */}
      <Link
        to={buildAnalyticsUrl()}
        className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-purple-500/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Conv. Rate</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-fg tracking-tight">
            {loading ? '...' : conversionRate}
          </p>
          <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
            <span>Success ÷ visits</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </Link>

      {/* Card 4: Active Markets */}
      <Link
        to="/markets"
        className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-500/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Active Markets</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-fg tracking-tight">
            {loading ? '...' : filteredMarketsCount}
          </p>
          <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
            <span>Countries / Operators</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </Link>

      {/* Card 5: Campaigns */}
      <Link
        to="/markets"
        className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-sky-500/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Campaigns</span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
            <FolderKanban className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-fg tracking-tight">
            {loading ? '...' : `${activeCampaignsCount} / ${filteredCampaignsCount}`}
          </p>
          <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
            <span>Active / Total</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </Link>

      {/* Card 6: Vendors */}
      <Link
        to="/vendors"
        className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-indigo-500/40"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Vendors</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
            <Store className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-fg tracking-tight">
            {loading ? '...' : `${vendorsCount} Vendors`}
          </p>
          <p className="text-[11px] text-fg-muted mt-1 flex items-center justify-between">
            <span>Partners (postbacks below)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </Link>
    </div>
  )
}

export default memo(DashboardKpiGrid)
