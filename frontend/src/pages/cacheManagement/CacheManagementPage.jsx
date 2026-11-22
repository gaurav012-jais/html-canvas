import { memo } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  ShieldAlert,
  Flame,
  UserCog,
} from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import CacheStatsGrid from './components/CacheStatsGrid'
import CacheScopesGrid from './components/CacheScopesGrid'
import KeyInspectorCard from './components/KeyInspectorCard'
import ConfirmPurgeModal from './components/ConfirmPurgeModal'
import { useCacheManagement } from './hooks/useCacheManagement'

function CacheManagementPage() {
  const {
    stats,
    loadingStats,
    purgingScope,
    confirmModal,
    scanPattern,
    keysList,
    loadingKeys,
    setScanPattern,
    setConfirmModal,
    fetchStats,
    fetchKeys,
    handleOpenPurgeScope,
    handleOpenFlushAll,
    handleExecutePurge,
    handleDeleteSingleKey,
  } = useCacheManagement()

  return (
    <AppShell
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats()
              fetchKeys()
            }}
            disabled={loadingStats || loadingKeys}
            className="gap-1.5"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingStats || loadingKeys ? 'animate-spin' : ''}`}
            />
            Refresh Telemetry
          </Button>
          <Link to="/admin/users">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <UserCog className="w-4 h-4" />
              Manage Users
            </Button>
          </Link>
        </div>
      }
    >
      <div className="page-container space-y-6">
        <div className="page-header">
          <h1 className="page-header-title">Cache & Redis Management</h1>
          <p className="page-header-description">
            Monitor real-time Redis telemetry, invalidate granular flow and campaign caches, or inspect and remove individual keys.
          </p>
        </div>

        <CacheStatsGrid stats={stats} loadingStats={loadingStats} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Scoped Cache Purges</h2>
            <span className="text-xs text-fg-subtle">Targeted key pattern invalidations</span>
          </div>
          <CacheScopesGrid
            onPurgeScope={handleOpenPurgeScope}
            purgingScope={purgingScope}
          />
        </div>

        <div className="surface-card p-5 border-danger/30 bg-danger/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-danger font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Full Cache Invalidation (Emergency Flush)</span>
            </div>
            <p className="text-xs text-fg-muted max-w-xl">
              Flushes entire Redis storage including all active sessions, flow layouts, rate limiters, and throttles.
              Recommended only during breaking migrations or severe configuration drift.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleOpenFlushAll}
            disabled={Boolean(purgingScope)}
            className="shrink-0 gap-1.5"
          >
            <Flame className="w-4 h-4" />
            Flush Entire Cache
          </Button>
        </div>

        <KeyInspectorCard
          scanPattern={scanPattern}
          setScanPattern={setScanPattern}
          keysList={keysList}
          loadingKeys={loadingKeys}
          onScan={() => fetchKeys(scanPattern)}
          onDeleteKey={handleDeleteSingleKey}
        />

        <ConfirmPurgeModal
          confirmModal={confirmModal}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleExecutePurge}
          purgingScope={purgingScope}
        />
      </div>
    </AppShell>
  )
}

export default memo(CacheManagementPage)
