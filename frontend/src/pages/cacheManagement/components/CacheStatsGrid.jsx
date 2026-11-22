import { memo } from 'react'
import { Server, HardDrive, Clock, CheckCircle2 } from 'lucide-react'

function CacheStatsGrid({ stats, loadingStats }) {
  const isHealthy = stats?.status === 'ok' || stats?.connected === true

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="surface-card p-4 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-info-muted/30 text-info shrink-0">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-fg-muted font-medium">Status</p>
          <p className="text-lg font-bold text-fg flex items-center gap-1.5 mt-0.5">
            {loadingStats ? (
              <span className="text-fg-subtle text-sm">Loading…</span>
            ) : isHealthy ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </>
            ) : (
              <span className="text-danger text-sm font-semibold">Degraded</span>
            )}
          </p>
        </div>
      </div>

      <div className="surface-card p-4 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-success-muted/30 text-success shrink-0">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-fg-muted font-medium">Memory Usage</p>
          <p className="text-lg font-bold text-fg mt-0.5">
            {loadingStats ? (
              <span className="text-fg-subtle text-sm">Loading…</span>
            ) : (
              stats?.usedMemoryHuman || stats?.memory || 'N/A'
            )}
          </p>
        </div>
      </div>

      <div className="surface-card p-4 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-warning-muted/30 text-warning shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-fg-muted font-medium">Uptime</p>
          <p className="text-lg font-bold text-fg mt-0.5">
            {loadingStats ? (
              <span className="text-fg-subtle text-sm">Loading…</span>
            ) : (
              stats?.uptimeHuman || stats?.uptime || 'N/A'
            )}
          </p>
        </div>
      </div>

      <div className="surface-card p-4 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-muted/30 text-primary shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-fg-muted font-medium">Total Keys</p>
          <p className="text-lg font-bold text-fg mt-0.5">
            {loadingStats ? (
              <span className="text-fg-subtle text-sm">Loading…</span>
            ) : (
              stats?.totalKeys ?? stats?.keysCount ?? 'N/A'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default memo(CacheStatsGrid)
