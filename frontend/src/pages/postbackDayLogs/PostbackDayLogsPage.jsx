import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  FileDown,
} from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { formatChartLabel, formatDate } from '../../utils/date'
import { rowKeyOf } from './dayLogConstants'
import Flag from './components/Flag'
import Kpi from './components/Kpi'
import NumberCard from './components/NumberCard'
import HitRow from './components/HitRow'
import StatsTable from './components/StatsTable'
import DayLogsFilterBar from './components/DayLogsFilterBar'
import DayLogsKpiGrid from './components/DayLogsKpiGrid'
import DayLogsViewTabs from './components/DayLogsViewTabs'
import { useDayLogsQuery } from './hooks/useDayLogsQuery'

export { Flag, Kpi, NumberCard, HitRow, StatsTable, DayLogsFilterBar }

function PostbackDayLogsPage() {
  const navigate = useNavigate()
  const {
    timezone,
    campaigns,
    vendors,
    datePreset,
    dateRange,
    data,
    stats,
    loading,
    error,
    searchDraft,
    setSearchDraft,
    filter,
    hitFilter,
    view,
    campaignId,
    vendorId,
    groupBy,
    page,
    expanded,
    exporting,
    summary,
    file,
    totalRows,
    totalPages,
    hitGroups,
    activeCampaignLabel,
    activeVendorLabel,
    applyPreset,
    applyCustomRange,
    applyFilter,
    applyHitFilter,
    applyView,
    applyCampaign,
    applyVendor,
    applyGroupBy,
    applySearch,
    setPage,
    toggleExpanded,
    drillStatsRow,
    handleExport,
    fetchDay,
  } = useDayLogsQuery()

  const rangeLabel = datePreset === 'custom'
    ? `${formatChartLabel(dateRange.from, timezone)} – ${formatChartLabel(dateRange.to, timezone)}`
    : formatChartLabel(dateRange.from, timezone)

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv')}
        disabled={exporting}
      >
        <FileDown className="w-4 h-4" />
        {exporting ? 'Exporting…' : 'Export CSV'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('json')}
        disabled={exporting}
      >
        <FileDown className="w-4 h-4" />
        JSON
      </Button>
      <Button variant="outline" size="sm" onClick={fetchDay} disabled={loading}>
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  )

  return (
    <AppShell actions={headerActions}>
      <div className="page-container space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/postbacks')}
              className="-ml-2 text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              All Postbacks
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Postback Day Logs — {rangeLabel}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Raw incoming operator callback hits and vendor fire outcomes for the selected day range.
            </p>
          </div>
        </div>

        <DayLogsFilterBar
          datePreset={datePreset}
          dateRange={dateRange}
          campaignId={campaignId}
          vendorId={vendorId}
          groupBy={groupBy}
          campaigns={campaigns}
          vendors={vendors}
          activeCampaignLabel={activeCampaignLabel}
          activeVendorLabel={activeVendorLabel}
          onApplyPreset={applyPreset}
          onApplyCustomRange={applyCustomRange}
          onApplyCampaign={applyCampaign}
          onApplyVendor={applyVendor}
          onApplyGroupBy={applyGroupBy}
        />

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <DayLogsKpiGrid
          summary={summary}
          file={file}
          applyView={applyView}
          applyFilter={applyFilter}
          applyHitFilter={applyHitFilter}
        />

        <StatsTable
          rows={stats?.rows || []}
          groupBy={stats?.groupBy || groupBy}
          totals={stats?.totals}
          onDrill={drillStatsRow}
        />

        <DayLogsViewTabs
          view={view}
          applyView={applyView}
          filter={filter}
          applyFilter={applyFilter}
          hitFilter={hitFilter}
          applyHitFilter={applyHitFilter}
          searchDraft={searchDraft}
          setSearchDraft={setSearchDraft}
          applySearch={applySearch}
        />

        {/* Content list */}
        {view === 'hits' ? (
          hitGroups.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <EmptyState
                icon={Clock}
                title="No callback hits found"
                description="No raw incoming callback requests matched the active filter for this day range."
              />
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              <div className="bg-gray-50/75 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                <span className="col-span-2">Time</span>
                <span className="col-span-3">MSISDN</span>
                <span className="col-span-3">Click ID / RCID</span>
                <span className="col-span-2">Match</span>
                <span className="col-span-2 text-right">Vendor Fire</span>
              </div>
              {hitGroups.map((hit, idx) => (
                <HitRow key={hit.hitId || `hit-${idx}`} hit={hit} timezone={timezone} />
              ))}
            </div>
          )
        ) : data.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            <EmptyState
              icon={FileText}
              title="No number records found"
              description="No numbers matched the active filter for this day range."
            />
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((row) => {
              const key = rowKeyOf(row)
              const isExpanded = expanded.has(key)
              return (
                <NumberCard
                  key={key}
                  row={row}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpanded(key)}
                  timezone={timezone}
                />
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-600">
            <span>
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, totalRows)} of {totalRows}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-xs font-semibold">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default memo(PostbackDayLogsPage)
