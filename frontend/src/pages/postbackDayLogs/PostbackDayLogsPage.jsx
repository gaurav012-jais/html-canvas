import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HardDrive,
  RefreshCw,
  FileDown,
} from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { formatChartLabel, formatDate } from '../../utils/date'
import { PAGE_SIZE, rowKeyOf } from './dayLogConstants'
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
    numberGroups,
    numbers,
    hits,
    load,
    applyDatePreset,
    updateDateField,
    applyFilter,
    applyHitFilter,
    applyView,
    applyCampaign,
    applyVendor,
    applyGroupBy,
    applySearch,
    drillStatsRow,
    exportLogs,
    goToPage,
    toggleRowExpanded,
  } = useDayLogsQuery()

  const rangeLabel = datePreset === 'custom'
    ? `${formatChartLabel(dateRange.from)} – ${formatChartLabel(dateRange.to)}`
    : formatChartLabel(dateRange.from)

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportLogs('csv')}
        disabled={exporting || loading}
      >
        <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
        {exporting ? 'Exporting…' : 'Export CSV'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportLogs('txt')}
        disabled={exporting || loading}
      >
        <FileText className="w-4 h-4" />
        Export TXT
      </Button>
      <Button variant="outline" size="sm" onClick={() => load({ writeFile: true })} disabled={loading}>
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Rewrite on server
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
          timezone={timezone}
          generatedAt={data?.generatedAt}
          campaignId={campaignId}
          vendorId={vendorId}
          groupBy={groupBy}
          campaigns={campaigns}
          vendors={vendors}
          exporting={exporting}
          loading={loading}
          applyDatePreset={applyDatePreset}
          updateDateField={updateDateField}
          applyCampaign={applyCampaign}
          applyVendor={applyVendor}
          applyGroupBy={applyGroupBy}
          exportLogs={exportLogs}
        />

        {file ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900">Log file written on server</p>
              <p className="mt-1 font-mono text-xs text-emerald-900 break-all">{file.absolutePath}</p>
              <p className="mt-1 text-[11px] text-emerald-800">
                {file.filename}
                {file.bytes != null ? ` · ${file.bytes} bytes` : ''}
                {file.writtenAt ? ` · ${formatDate(file.writtenAt)}` : ''}
                {' · overwrite same range on Rewrite'}
              </p>
            </div>
          </div>
        ) : null}

        {data?.fileError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            Server file write failed: {data.fileError}
          </div>
        ) : null}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <DayLogsKpiGrid
          stats={stats}
          summary={summary}
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
        {loading && !data ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-500">
            Loading day logs…
          </div>
        ) : view === 'hits' ? (
          hits.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8">
              <EmptyState
                icon={Clock}
                title="No callback hits found"
                description="No raw incoming callback requests matched the active filter for this day range."
              />
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {hitGroups.map((group) => (
                <div key={group.date}>
                  <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {formatChartLabel(group.date)} · {group.rows.length} hit
                    {group.rows.length === 1 ? '' : 's'}
                  </div>
                  {group.rows.map((hit, idx) => (
                    <HitRow key={`${hit.id || hit.hitId || hit.at}-${idx}`} hit={hit} />
                  ))}
                </div>
              ))}
            </div>
          )
        ) : numbers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            <EmptyState
              icon={FileText}
              title="No number records found"
              description={
                filter === 'he_fail_cg'
                  ? 'When token/resolve does not return a number and we send the user to the CG page, those visits show up here.'
                  : 'No numbers matched the active filter for this day range.'
              }
            />
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {numberGroups.map((group) => (
              <div key={group.date}>
                {numberGroups.length > 1 ? (
                  <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {formatChartLabel(group.date)} · {group.rows.length}
                  </div>
                ) : null}
                {group.rows.map((row) => {
                  const key = rowKeyOf(row)
                  const isExpanded = expanded.has(key)
                  return (
                    <NumberCard
                      key={key}
                      row={row}
                      expanded={isExpanded}
                      onToggle={() => toggleRowExpanded(key)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-600">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
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
                onClick={() => goToPage(page + 1)}
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
