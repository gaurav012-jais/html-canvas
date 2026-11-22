import { memo } from 'react'
import { Eye, ScanSearch, Zap } from 'lucide-react'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import { formatDate } from '../../../utils/date'
import { operatorStatusBadge, delayedChecksubBadge, statusBadge } from '../postbackBadges'

function PostbackTable({
  items,
  total,
  page,
  totalPages,
  loading,
  firingId,
  checksubingId,
  setCampaignId,
  setPage,
  navigate,
  fireVendorPostback,
  handleRunChecksubNow,
}) {
  if (loading && !items.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden p-10 text-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <EmptyState
          title="No postbacks yet"
          description="Rows appear when the operator hits /api/flow/callback, or when a funnel subscribe click queues pending."
        />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/40">
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-3 py-3 font-medium">Offer</th>
              <th className="px-3 py-3 font-medium">MSISDN</th>
              <th className="px-3 py-3 font-medium">Callback</th>
              <th className="px-3 py-3 font-medium">30m Check</th>
              <th className="px-3 py-3 font-medium">Postback</th>
              <th className="px-3 py-3 font-medium">Vendor</th>
              <th className="px-3 py-3 font-medium">Click ID</th>
              <th className="px-3 py-3 font-medium">RCID</th>
              <th className="px-3 py-3 font-medium">Campid</th>
              <th className="px-3 py-3 font-medium text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-50 hover:bg-indigo-50/30 cursor-pointer"
                onClick={() => navigate(`/postbacks/${row.id}`)}
              >
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                  {formatDate(row.createdAt)}
                </td>
                <td
                  className="px-3 py-3"
                  title={row.campaignId ? 'Click to filter by this offer' : ''}
                  onClick={(e) => {
                    if (row.campaignId) {
                      e.stopPropagation()
                      setCampaignId(String(row.campaignId))
                    }
                  }}
                >
                  <div
                    className={`font-medium text-xs text-gray-900 truncate max-w-[140px] ${
                      row.campaignId ? 'hover:text-indigo-600 transition-colors' : ''
                    }`}
                    title={row.campaignName || (row.campaignId ? `Campaign #${row.campaignId}` : '')}
                  >
                    {row.campaignName || (row.campaignId ? `Campaign #${row.campaignId}` : '—')}
                  </div>
                  {row.offerCode || row.trackingCampid ? (
                    <div
                      className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]"
                      title={row.offerCode || row.trackingCampid || ''}
                    >
                      {row.offerCode || row.trackingCampid}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-gray-800">{row.msisdn || '—'}</td>
                <td className="px-3 py-3">
                  <span className={operatorStatusBadge(row.operatorStatus)}>
                    {row.operatorStatus || '—'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {delayedChecksubBadge(row.delayedChecksubStatus, row.delayedChecksubOutcome)}
                </td>
                <td className="px-3 py-3">
                  <span className={statusBadge(row.status)}>{row.status}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="text-gray-800">{row.vendorName || '—'}</div>
                  {row.vendorCode ? (
                    <div className="text-[11px] text-gray-400 font-mono">{row.vendorCode}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-gray-800 max-w-[160px] truncate" title={row.clickId || ''}>
                  {row.clickId || '—'}
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-gray-800 max-w-[180px] truncate" title={row.rcid || ''}>
                  {row.rcid || '—'}
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-gray-600">
                  {row.campid || '—'}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Run checksub now (verify subscription status with partner)"
                      disabled={checksubingId === row.id}
                      onClick={(e) => handleRunChecksubNow(row, e)}
                    >
                      <ScanSearch className={`w-4 h-4 ${checksubingId === row.id ? 'animate-pulse text-indigo-500' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Fire vendor postback"
                      disabled={firingId === row.id}
                      onClick={(e) => fireVendorPostback(row, e)}
                    >
                      <Zap className={`w-4 h-4 ${firingId === row.id ? 'animate-pulse' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/postbacks/${row.id}`)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default memo(PostbackTable)
