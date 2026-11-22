import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { formatDate } from '../../../utils/date'

function Step({ done, failed, title, subtitle, children }) {
  let Icon = Circle
  let iconClass = 'text-gray-300'
  if (failed) {
    Icon = XCircle
    iconClass = 'text-rose-500'
  } else if (done) {
    Icon = CheckCircle2
    iconClass = 'text-emerald-500'
  }
  return (
    <div className="flex gap-3">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
        {children ? <div className="mt-2 text-sm text-gray-700">{children}</div> : null}
      </div>
    </div>
  )
}

export function PostbackLifecycleCard({ data }) {
  const life = data?.lifecycle || {}
  const fireFailed = life.vendorFireStatus === 'failed'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">Lifecycle</h2>
      <div className="space-y-5">
        <Step
          done={life.created}
          title="Postback created"
          subtitle={life.createdAt ? formatDate(life.createdAt) : null}
        >
          Queued in conversion_postbacks. Some flows (no operator billing
          callback) stay pending until you fire vendor CPA from this page.
          Funnel subscribe click can also create pending; HE detect does not.
        </Step>
        <Step
          done={life.billingReceived}
          title="Billing callback received"
          subtitle={
            life.billingReceived
              ? life.billingReceivedAt
                ? formatDate(life.billingReceivedAt)
                : 'Yes'
              : 'Not received yet'
          }
        >
          {life.billingReceived
            ? life.vendorFireSkipReason ||
              `Operator hit /api/flow/callback — status ${life.operatorStatus || data.operatorStatus || 'received'}.`
            : 'Not required for every flow. If no operator callback arrives, use Fire postback to send vendor CPA.'}
        </Step>
        <Step
          done={life.vendorFired && !fireFailed}
          failed={fireFailed}
          title={
            fireFailed
              ? 'Vendor fire failed'
              : life.vendorFired
                ? 'Vendor CPA fired'
                : 'Vendor CPA not fired'
          }
          subtitle={
            life.vendorName
              ? `Sent to: ${life.vendorName}${life.vendorCode ? ` (${life.vendorCode})` : ''}`
              : null
          }
        >
          {life.vendorFired ? (
            <div className="space-y-1 text-xs font-mono text-gray-600">
              <div>status: {life.vendorFireStatus}</div>
              {data.httpStatus != null ? <div>HTTP: {data.httpStatus}</div> : null}
              {data.sentAt ? <div>sentAt: {formatDate(data.sentAt)}</div> : null}
              {data.errorMessage ? (
                <div className="text-rose-600 whitespace-pre-wrap">{data.errorMessage}</div>
              ) : null}
            </div>
          ) : life.vendorFireSkipReason ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
              {life.vendorFireSkipReason}
              {life.allowedStatuses || life.receivedStatus ? (
                <span className="block font-mono mt-1">
                  allowed: {life.allowedStatuses || '—'} · received:{' '}
                  {life.receivedStatus || life.operatorStatus || '—'}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Waiting for a billable operator status, or fire it manually above.
            </p>
          )}
        </Step>
      </div>
    </div>
  )
}
