import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Activity, AlertTriangle, ChevronRight } from 'lucide-react'
import AppShell from '../../components/ui/AppShell'
import Button from '../../components/ui/Button'
import { useSessionTrace } from './hooks/useSessionTrace'
import { SessionOverviewGrid } from './components/SessionOverviewGrid'
import { ApiCallCard } from './components/ApiCallCard'
import { SessionFlowTimeline } from './components/SessionFlowTimeline'

export function SessionDetailPage() {
  const {
    visitId,
    navigate,
    loading,
    error,
    detail,
    visit,
    apiById,
    flowSteps,
    viewMode,
    setViewMode,
    load,
  } = useSessionTrace()

  return (
    <AppShell
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/analytics')
            }
          }}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to logs
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Session detail
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            {visit?.clickId ? (
              <span className="font-mono">{visit.clickId}</span>
            ) : (
              <>Visit #{visitId}</>
            )}
            {visit?.campaignName ? (
              <span className="text-gray-400 font-medium"> · {visit.campaignName}</span>
            ) : null}
          </h1>
          {visit?.clickId ? (
            <p className="text-xs text-gray-400 mt-1 font-mono">Visit #{visitId}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs font-semibold text-gray-500">Loading session…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-2 text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={load}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SessionOverviewGrid visit={visit} />

            {(detail?.pagePath || []).length > 0 ? (
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Funnel pages</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.pagePath.map((page, idx) => (
                    <div key={`${page}-${idx}`} className="flex items-center gap-2">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100 bg-indigo-50 text-indigo-700">
                        {page}
                      </span>
                      {idx < detail.pagePath.length - 1 ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-900">API calls</h2>
              {(detail?.apiCalls || []).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No partner API calls logged for this visit.</p>
              ) : (
                <div className="space-y-3">
                  {detail.apiCalls.map((call, idx) => (
                    <ApiCallCard
                      key={call.id}
                      call={call}
                      defaultOpen={
                        call.callType === 'checksub' ||
                        call.callType === 'priority' ||
                        call.callType === 'vendor_postback' ||
                        call.callType === 'billing_callback' ||
                        idx === 0
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <SessionFlowTimeline
              viewMode={viewMode}
              setViewMode={setViewMode}
              flowSteps={flowSteps}
              rawTimeline={detail?.timeline}
              apiById={apiById}
              visit={visit}
            />

            <div className="pt-2">
              <Link
                to="/analytics"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                ← Back to Campaign Logs
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

export default memo(SessionDetailPage)
