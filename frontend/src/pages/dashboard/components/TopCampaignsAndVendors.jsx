import { memo } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Store, ArrowUpRight, ChevronRight } from 'lucide-react'

export function TopCampaignsAndVendors({ campaigns, vendors }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Campaigns List */}
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-fg">Top Campaigns</h2>
          </div>
          <Link
            to="/markets"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            Manage Campaigns <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-4 flex-1 space-y-2">
          {campaigns.length === 0 ? (
            <div className="p-6 text-center text-xs text-fg-muted">No campaigns created yet.</div>
          ) : (
            campaigns.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to={`/markets/${c.countryCode || 'IN'}/${c.operatorCode || 'ALL'}/campaigns/${c.id}`}
                className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-bg-subtle transition-all"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-fg truncate group-hover:text-accent transition-colors">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-fg-muted truncate mt-0.5">
                    {c.country} / {c.operator} &bull; ID: {c.trackingId || c.id}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                      c.active
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    }`}
                  >
                    {c.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Vendors & Partners Summary */}
      <div className="bg-bg-elevated rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-fg">Active Vendors & Postbacks</h2>
          </div>
          <Link
            to="/vendors"
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            View Vendors <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-4 flex-1 space-y-2">
          {vendors.length === 0 ? (
            <div className="p-6 text-center text-xs text-fg-muted">No vendors registered yet.</div>
          ) : (
            vendors.slice(0, 5).map((v) => (
              <Link
                key={v.id}
                to={`/vendors`}
                className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-bg-subtle transition-all"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-fg truncate group-hover:text-accent transition-colors">
                    {v.name} ({v.code})
                  </p>
                  <p className="text-[11px] text-fg-muted truncate mt-0.5">
                    Postback URL: {v.postbackUrl ? 'Configured' : 'Not Configured'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    {v.active ? 'Active' : 'Disabled'}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(TopCampaignsAndVendors)
