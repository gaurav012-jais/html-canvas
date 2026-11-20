import { memo } from 'react'
import {
  Clock,
  Phone,
  Eye,
  RefreshCw,
  Database,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { SectionCard } from './LogCards'
import { getEventBadgeClass, getStatusBadgeClass } from '../logConstants'
import { formatDate } from '../../../utils/date'

export function LogsTable({
  logs,
  loading,
  selectedId,
  getCampaignLabel,
  getVendorLabel,
  openVisitDetail,
  page,
  setPage,
  totalPages,
  handleExport,
  exportingFormat,
}) {
  return (
    <SectionCard
      title="Clicks (one row per click ID)"
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-block text-[11px] text-gray-400 font-medium">
            Total: <strong className="text-gray-700 font-bold">{logs.total || 0}</strong> clicks
          </span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={loading || Boolean(exportingFormat) || logs.total === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Export all rows with selected filters without pagination"
            >
              <Download
                className={`w-3.5 h-3.5 ${
                  exportingFormat === 'csv' ? 'animate-bounce text-indigo-600' : 'text-indigo-500'
                }`}
              />
              {exportingFormat === 'csv' ? 'Exporting...' : 'Export (Full)'}
            </button>
            <div className="w-[1px] bg-gray-200 my-1" />
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={loading || Boolean(exportingFormat) || logs.total === 0}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-700 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Export all rows with selected filters as Excel (.xlsx)"
            >
              <FileSpreadsheet
                className={`w-3.5 h-3.5 ${
                  exportingFormat === 'xlsx' ? 'animate-bounce text-emerald-600' : 'text-emerald-500'
                }`}
              />
              {exportingFormat === 'xlsx' ? 'Exporting...' : 'XLSX'}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-gray-500">Retrieving campaign logs telemetry...</p>
        </div>
      ) : logs.items.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">
            No clicks match these filters.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="min-w-full divide-y divide-gray-100 text-left">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100">
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</span>
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Click ID</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">RCID</th>
                  {selectedId === 'all' && (
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Campaign</th>
                  )}
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Campid</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> MSISDN</span>
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Event</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {logs.items.map((row, idx) => (
                  <tr
                    key={`${row.visitId}-${row.clickId || 's'}-${idx}`}
                    className="hover:bg-indigo-50/40 transition-colors duration-150 cursor-pointer"
                    onClick={() => openVisitDetail(row.visitId)}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {row.timestamp ? formatDate(row.timestamp) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-800 font-semibold whitespace-nowrap">
                      {row.clickId || <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td
                      className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap max-w-[180px] truncate"
                      title={row.rcid || ''}
                    >
                      {row.rcid || <span className="text-gray-300">—</span>}
                    </td>
                    {selectedId === 'all' && (
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {row.campaignId ? (
                          <span className="font-semibold text-gray-800">
                            {getCampaignLabel(row.campaignId)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {row.vendorId || row.vidRaw ? (
                        <span className="font-semibold text-gray-800">
                          {getVendorLabel(row.vendorId) || row.vidRaw}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap max-w-[140px] truncate"
                      title={row.campid || ''}
                    >
                      {row.campid || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                      {row.phone || row.phoneMasked ? (
                        row.phone || row.phoneMasked
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {row.eventType ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getEventBadgeClass(
                            row.eventType,
                          )}`}
                        >
                          {row.eventType}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {row.status ? (
                        <span className={`font-bold tracking-wide text-[11px] ${getStatusBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        title="View click detail"
                        aria-label="View click detail"
                        disabled={!row.visitId}
                        onClick={(e) => {
                          e.stopPropagation()
                          openVisitDetail(row.visitId)
                        }}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-5 bg-gray-50/50 p-4 border border-gray-100 rounded-xl">
            <p className="text-xs font-medium text-gray-500">
              Page <span className="font-bold text-gray-800">{logs.page}</span> of{' '}
              <span className="font-bold text-gray-800">{totalPages}</span> · Total{' '}
              <span className="font-bold text-indigo-600">{logs.total}</span> clicks
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-gray-200 text-gray-600 bg-white disabled:bg-gray-50 disabled:text-gray-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-gray-200 text-gray-600 bg-white disabled:bg-gray-50 disabled:text-gray-300"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  )
}

export default memo(LogsTable)
