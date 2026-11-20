import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export function VendorQualityTable({ loading, vendorQualityList }) {
  const navigate = useNavigate()

  return (
    <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-emerald-500 rounded-full" />
            <h2 className="text-sm font-bold text-fg">Vendor Traffic & 30m CheckSub Quality</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Audit Metrics
            </span>
          </div>
          <p className="text-[11px] text-fg-muted mt-1">
            Subscribed attempts vs actually billed subscribers after the 30-minute checksub window.
          </p>
        </div>
        <Link
          to="/postbacks"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
        >
          View in Postbacks <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-fg-muted animate-pulse">
            Loading vendor quality stats...
          </div>
        ) : vendorQualityList.length === 0 ? (
          <div className="p-8 text-center text-xs text-fg-muted">
            No vendor conversion activity in this date range.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-muted/30 text-fg-muted text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-4 py-3 text-right">Attempts (Subscribed)</th>
                <th className="px-4 py-3 text-right">30m Active (Billed)</th>
                <th className="px-4 py-3 text-right">Parking / Zero-Bal</th>
                <th className="px-4 py-3 text-right">30m Pending</th>
                <th className="px-5 py-3 text-right">Quality % (Active / Attempt)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {vendorQualityList.map((row) => {
                const isGood = row.qualityPct >= 70
                const isMid = row.qualityPct >= 40 && row.qualityPct < 70
                return (
                  <tr
                    key={row.vendorId ?? row.vendorName}
                    className="hover:bg-bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() =>
                      navigate(row.vendorId ? `/postbacks?vendorId=${row.vendorId}` : '/postbacks')
                    }
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-fg group-hover:text-accent transition-colors">
                          {row.vendorName}
                        </span>
                        {row.vendorCode && (
                          <span className="font-mono text-[10px] text-fg-muted px-1.5 py-0.5 rounded bg-bg-muted border border-border">
                            {row.vendorCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-fg">
                      {Number(row.totalAttempts || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(row.checksubActive || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                      {Number(row.checksubParking || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-fg-muted">
                      {Number(row.checksubPending || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-bg-muted h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, row.qualityPct))}%` }}
                          />
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                            isGood
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : isMid
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {row.qualityPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default memo(VendorQualityTable)
