import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileDown, RefreshCw } from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import PostbackKpiGrid from './components/PostbackKpiGrid'
import PostbackFilterBar from './components/PostbackFilterBar'
import PostbackTable from './components/PostbackTable'
import { usePostbacksQuery } from './hooks/usePostbacksQuery'

function PostbacksPage() {
  const navigate = useNavigate()
  const {
    campaigns,
    vendors,
    summary,
    items,
    total,
    page,
    totalPages,
    status,
    operatorStatus,
    campaignId,
    vendorId,
    q,
    searchDraft,
    loading,
    error,
    datePreset,
    dateRange,
    exporting,
    firingId,
    checksubingId,
    campaignOptions,
    vendorOptions,
    load,
    applyDatePreset,
    updateDateField,
    logsQuery,
    exportLogs,
    fireVendorPostback,
    handleRunChecksubNow,
    handleResetFilters,
    handleSearchSubmit,
    handleSelectCampaign,
    handleSelectVendor,
    handleSelectStatus,
    handleSelectOperatorStatus,
    setSearchDraft,
    setPage,
  } = usePostbacksQuery()

  return (
    <AppShell
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            disabled={exporting || !dateRange.from || !dateRange.to}
          >
            <FileDown className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export logs'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(logsQuery())}
          >
            View logs
          </Button>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </>
      }
    >
      <div className="page-container space-y-6">
        <div className="page-header">
          <h1 className="page-header-title">Postbacks</h1>
          <p className="page-header-description">
            MSISDN resolve → postback queue → billing callback (or manual fire) → vendor CPA.
            <span className="font-medium text-gray-700"> Fire postback</span> sends vendor CPA
            without waiting for an operator callback.
            <span className="font-medium text-gray-700"> Export logs</span> downloads
            the selected date range as CSV (and writes the same file on the server).
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">
            {error}
          </div>
        ) : null}

        <PostbackKpiGrid
          summary={summary}
          operatorStatus={operatorStatus}
          logsQuery={logsQuery}
          navigate={navigate}
          onSelectOperatorStatus={handleSelectOperatorStatus}
        />

        <PostbackFilterBar
          dateRange={dateRange}
          datePreset={datePreset}
          campaignId={campaignId}
          campaignOptions={campaignOptions}
          vendorId={vendorId}
          vendorOptions={vendorOptions}
          operatorStatus={operatorStatus}
          status={status}
          q={q}
          searchDraft={searchDraft}
          exporting={exporting}
          campaigns={campaigns}
          vendors={vendors}
          updateDateField={updateDateField}
          applyDatePreset={applyDatePreset}
          setCampaignId={handleSelectCampaign}
          setVendorId={handleSelectVendor}
          setOperatorStatus={handleSelectOperatorStatus}
          setStatus={handleSelectStatus}
          setSearchDraft={setSearchDraft}
          handleSearchSubmit={handleSearchSubmit}
          handleResetFilters={handleResetFilters}
          exportLogs={exportLogs}
          logsQuery={logsQuery}
          navigate={navigate}
          load={load}
        />

        <PostbackTable
          items={items}
          total={total}
          page={page}
          totalPages={totalPages}
          loading={loading}
          firingId={firingId}
          checksubingId={checksubingId}
          setCampaignId={handleSelectCampaign}
          setPage={setPage}
          navigate={navigate}
          fireVendorPostback={fireVendorPostback}
          handleRunChecksubNow={handleRunChecksubNow}
        />

        <p className="text-xs text-gray-400">
          Billing callback docs:{' '}
          <Link to="/docs/callbacks" className="text-indigo-600 hover:underline">
            Callbacks
          </Link>
        </p>
      </div>
    </AppShell>
  )
}

export default memo(PostbacksPage)
