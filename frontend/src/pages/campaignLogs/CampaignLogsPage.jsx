import { memo } from 'react'
import { RefreshCw, Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import { useLogsQuery } from './hooks/useLogsQuery'
import LogsFilterBar from './components/LogsFilterBar'
import LogsCharts from './components/LogsCharts'
import LogsTable from './components/LogsTable'

export function CampaignLogsPage() {
  const {
    campaigns,
    vendors,
    selectedId,
    setSelectedId,
    esEnabled,
    datePreset,
    compareEvents,
    setCompareEvents,
    filters,
    page,
    setPage,
    aggs,
    logs,
    loading,
    exportingFormat,
    handleExport,
    fetchData,
    openVisitDetail,
    isHourly,
    timezone,
    currentFlowSpec,
    flowType,
    activePresets,
    selectedSeries,
    funnelTotals,
    funnelBarData,
    funnelCompareData,
    compareRatio,
    compareRatioHint,
    toggleCompareEvent,
    totalEvents,
    otpStats,
    eventTypeOptions,
    statusOptions,
    chartEventCategory,
    setChartEventCategory,
    eventsByTypeData,
    statusDistributionData,
    totalPages,
    timeSeriesData,
    getCampaignLabel,
    getVendorLabel,
    updateFilter,
    applyDatePreset,
  } = useLogsQuery()

  return (
    <AppShell>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Campaign Logs
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              One row per click ID. Open a row for funnel pages, events, and API timeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <div className="inline-flex rounded-xl shadow-2xs border border-gray-200/80 bg-white overflow-hidden p-0.5">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                disabled={loading || Boolean(exportingFormat)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                title="Export all filtered clicks without pagination as CSV"
              >
                <Download
                  className={`w-3.5 h-3.5 ${
                    exportingFormat === 'csv' ? 'animate-bounce text-indigo-600' : 'text-gray-500'
                  }`}
                />
                {exportingFormat === 'csv' ? 'Exporting...' : 'Export CSV'}
              </button>
              <div className="w-[1px] bg-gray-200 my-1" />
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                disabled={loading || Boolean(exportingFormat)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-emerald-600 hover:bg-emerald-50/60 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                title="Export all filtered clicks without pagination as Excel (.xlsx)"
              >
                <FileSpreadsheet
                  className={`w-3.5 h-3.5 ${
                    exportingFormat === 'xlsx' ? 'animate-bounce text-emerald-600' : 'text-gray-500'
                  }`}
                />
                {exportingFormat === 'xlsx' ? 'Exporting...' : 'Excel'}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 border-gray-200/80 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs font-semibold px-4 py-2 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {!esEnabled && (
          <div className="mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-sm text-amber-800 flex items-start gap-3 backdrop-blur-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Elasticsearch not configured</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Set{' '}
                <code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded text-amber-900">
                  ELASTICSEARCH_NODE
                </code>{' '}
                to enable search. Falling back to SQL Database logs mode.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Filters Panel */}
        <LogsFilterBar
          datePreset={datePreset}
          applyDatePreset={applyDatePreset}
          timezone={timezone}
          isHourly={isHourly}
          filters={filters}
          updateFilter={updateFilter}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          campaigns={campaigns}
          vendors={vendors}
          currentFlowSpec={currentFlowSpec}
          flowType={flowType}
          eventTypeOptions={eventTypeOptions}
          statusOptions={statusOptions}
          onResetPage={() => setPage(1)}
        />

        {/* Analytics Charts */}
        <LogsCharts
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
          totalEvents={totalEvents}
          logsTotal={logs.total}
          aggs={aggs}
          selectedId={selectedId}
          otpStats={otpStats}
          timeSeriesData={timeSeriesData}
          eventsByTypeData={eventsByTypeData}
          chartEventCategory={chartEventCategory}
          setChartEventCategory={setChartEventCategory}
          currentFlowSpec={currentFlowSpec}
          flowType={flowType}
          statusDistributionData={statusDistributionData}
          getVendorLabel={getVendorLabel}
        />

        {/* Clicks List Table */}
        <LogsTable
          logs={logs}
          loading={loading}
          selectedId={selectedId}
          getCampaignLabel={getCampaignLabel}
          getVendorLabel={getVendorLabel}
          openVisitDetail={openVisitDetail}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          handleExport={handleExport}
          exportingFormat={exportingFormat}
        />
      </div>
    </AppShell>
  )
}

export default memo(CampaignLogsPage)
