import { memo } from 'react'

function StatsTable({ rows, groupBy, totals, onDrill }) {
  const showDate = groupBy === 'date'
  const showCampaign = groupBy === 'campaign' || groupBy === 'campaign_vendor'
  const showVendor = groupBy === 'vendor' || groupBy === 'campaign_vendor'
  const cols = [
    showDate ? { key: 'date', label: 'Date' } : null,
    showCampaign ? { key: 'campaign', label: 'Campaign' } : null,
    showVendor ? { key: 'vendor', label: 'Vendor' } : null,
    { key: 'visits', label: 'Visits' },
    { key: 'heFailCg', label: 'HE→CG' },
    { key: 'postbacksQueued', label: 'Queued' },
    { key: 'billingReceived', label: 'Billing' },
    { key: 'vendorSent', label: 'Sent' },
    { key: 'vendorFailed', label: 'Failed' },
    { key: 'unmatchedCallbacks', label: 'Unmatched' },
  ].filter(Boolean)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Breakdown</h3>
        <p className="text-[11px] text-gray-400">Click a row to open matching hits / numbers</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80">
              {cols.map((col) => (
                <th key={col.key} className="text-left font-semibold px-4 py-2 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => (
              <tr
                key={row.key}
                className="border-t border-gray-50 hover:bg-indigo-50/40 cursor-pointer"
                onClick={() => onDrill(row)}
              >
                {showDate ? (
                  <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                    {row.statDate}
                  </td>
                ) : null}
                {showCampaign ? (
                  <td className="px-4 py-2 text-gray-700">{row.campaignName || '—'}</td>
                ) : null}
                {showVendor ? (
                  <td className="px-4 py-2 text-gray-700">
                    {row.vendorName || '—'}
                    {row.vendorCode ? (
                      <span className="text-gray-400 font-mono text-[11px]"> · {row.vendorCode}</span>
                    ) : null}
                  </td>
                ) : null}
                <td className="px-4 py-2 tabular-nums">{row.visits || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.heFailCg || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.postbacksQueued || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.billingReceived || 0}</td>
                <td className="px-4 py-2 tabular-nums text-emerald-700">{row.vendorSent || 0}</td>
                <td className="px-4 py-2 tabular-nums text-rose-700">{row.vendorFailed || 0}</td>
                <td className="px-4 py-2 tabular-nums">{row.unmatchedCallbacks || 0}</td>
              </tr>
            ))}
            {totals && rows?.length ? (
              <tr className="border-t border-gray-200 bg-gray-50/70 font-semibold">
                <td className="px-4 py-2" colSpan={Math.max(1, cols.length - 7)}>
                  Total
                </td>
                <td className="px-4 py-2 tabular-nums">{totals.visits || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.heFailCg || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.postbacksQueued || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.billingReceived || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.vendorSent || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.vendorFailed || 0}</td>
                <td className="px-4 py-2 tabular-nums">{totals.unmatchedCallbacks || 0}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {!rows?.length ? (
        <p className="px-5 py-6 text-sm text-gray-500 text-center">
          No rolled-up stats for this range yet. Totals appear after traffic, or on the next refresh.
        </p>
      ) : null}
    </div>
  )
}

export default memo(StatsTable)
