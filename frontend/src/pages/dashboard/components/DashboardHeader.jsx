import { memo } from 'react'
import {
  LayoutDashboard,
  RefreshCw,
  Filter,
  Globe,
  Layers,
  FolderKanban,
  X,
  Calendar,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { DASHBOARD_DATE_PRESETS } from '../dashboardConstants'

export function DashboardHeader({
  timezone,
  preset,
  handlePresetChange,
  fetchDashboardData,
  refreshing,
  loading,
  selectedCountry,
  handleCountryChange,
  availableCountries,
  selectedOperator,
  handleOperatorChange,
  availableOperators,
  selectedCampaignId,
  setSelectedCampaignId,
  availableCampaigns,
  handleClearFilters,
  customRange,
  setCustomRange,
  handleCustomDateApply,
}) {
  return (
    <>
      <div className="flex flex-col gap-4 bg-bg-elevated p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-muted text-accent">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-fg tracking-tight">Executive Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live System
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-1">
              Today is live from visits/postbacks. Older days are dumped into daily_stats at midnight ({timezone})
            </p>
          </div>

          {/* Date Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border">
              {DASHBOARD_DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    preset === p.id
                      ? 'bg-accent text-accent-fg shadow-xs font-semibold'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-subtle'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing || loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Cascading Filter Bar: Country -> Operator -> Campaign */}
        <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted mr-1">
            <Filter className="w-3.5 h-3.5 text-accent" />
            <span>Filters:</span>
          </div>

          {/* Country Selector */}
          <div className="flex items-center bg-bg-base rounded-xl border border-border px-2.5 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-fg-muted mr-1.5" />
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="bg-transparent text-fg text-xs focus:outline-none cursor-pointer"
            >
              <option value="">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Operator Selector */}
          <div className="flex items-center bg-bg-base rounded-xl border border-border px-2.5 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-fg-muted mr-1.5" />
            <select
              value={selectedOperator}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className="bg-transparent text-fg text-xs focus:outline-none cursor-pointer"
            >
              <option value="">All Operators</option>
              {availableOperators.map((op) => (
                <option key={op.code} value={op.code}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campaign Selector */}
          <div className="flex items-center bg-bg-base rounded-xl border border-border px-2.5 py-1 text-xs max-w-xs">
            <FolderKanban className="w-3.5 h-3.5 text-fg-muted mr-1.5 shrink-0" />
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="bg-transparent text-fg text-xs focus:outline-none cursor-pointer truncate"
            >
              <option value="">All Campaigns</option>
              {availableCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (#{c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(selectedCountry || selectedOperator || selectedCampaignId) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear Filters
            </button>
          )}

          {/* Active filter badge summary */}
          {(selectedCountry || selectedOperator || selectedCampaignId) && (
            <span className="text-[11px] text-accent font-medium ml-auto">
              Filtered view active
            </span>
          )}
        </div>
      </div>

      {/* Custom Range Picker Drawer */}
      {preset === 'custom' && (
        <div className="bg-bg-elevated p-4 rounded-2xl border border-border flex flex-wrap items-center gap-3 animate-fade-in">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium text-fg">Custom Range:</span>
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-bg-base text-fg focus:outline-none focus:border-accent"
          />
          <span className="text-xs text-fg-muted">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-bg-base text-fg focus:outline-none focus:border-accent"
          />
          <Button size="sm" onClick={handleCustomDateApply}>
            Apply Filter
          </Button>
        </div>
      )}
    </>
  )
}

export default memo(DashboardHeader)
