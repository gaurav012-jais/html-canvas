import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Flag from './Flag'
import { formatDate } from '../../../utils/date'

function NumberCard({ row, expanded, onToggle }) {
  const fireFail = row.vendorFireStatus === 'failed'
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-3.5 hover:bg-indigo-50/30 flex flex-wrap items-start gap-3"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">
              {row.msisdn || '(no MSISDN)'}
            </span>
            <Flag
              label="Number"
              yes={Boolean(row.msisdnReceived ?? row.msisdn)}
              extra={row.msisdn || 'no MSISDN on callback'}
            />
            {row.outcome === 'he_fail_cg' ? (
              <Flag label="CG redirect" yes fail extra={row.cgUrl || 'fail URL'} />
            ) : row.outcome === 'callback_unmatched' ? (
              <Flag label="Unmatched" fail extra={row.unmatchedReason || 'not in system'} />
            ) : (
              <>
                <Flag label="Queued" yes={row.queued} extra={row.status || ''} />
                <Flag label="Received" yes={row.billingReceived} extra="billing /callback" />
                <Flag
                  label="Fired"
                  yes={row.vendorFired && !fireFail}
                  fail={fireFail}
                  extra={row.vendorFireStatus}
                />
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-600">{row.outcomeLabel}</p>
        </div>
        <div className="text-[11px] text-gray-400 whitespace-nowrap">
          {row.outcome === 'he_fail_cg'
            ? row.visitId
              ? `visit #${row.visitId}`
              : 'HE fail'
            : row.vendorName || '—'}
        </div>
      </button>
      {expanded ? (
        <div className="px-5 pb-4 pl-12 space-y-3">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Status row</dt>
              <dd className="font-mono text-xs">
                {row.postbackId ? `#${row.postbackId}` : 'none'} · {row.status || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Queued at</dt>
              <dd>{formatDate(row.queuedAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Callback received</dt>
              <dd>
                {row.billingReceived
                  ? `${formatDate(row.billingReceivedAt)}${row.billingHttp != null ? ` · HTTP ${row.billingHttp}` : ''}`
                  : 'Not received'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Vendor fire</dt>
              <dd>
                {row.vendorFired
                  ? `${row.vendorFireStatus} · ${formatDate(row.vendorFiredAt)}${row.vendorHttp != null ? ` · HTTP ${row.vendorHttp}` : ''}`
                  : 'Not fired'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">click_id / rcid</dt>
              <dd className="font-mono text-xs break-all">
                {row.clickId || '—'} / {row.rcid || '—'}
              </dd>
            </div>
            {row.cgUrl || row.redirectedToCg ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">CG / fail URL</dt>
                <dd className="font-mono text-xs break-all">{row.cgUrl || '—'}</dd>
              </div>
            ) : null}
            {row.heError ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">HE error</dt>
                <dd className="text-xs text-rose-600 whitespace-pre-wrap">{row.heError}</dd>
              </div>
            ) : null}
            {row.unmatchedReason ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">Unmatched reason</dt>
                <dd className="text-xs text-rose-600">{row.unmatchedReason}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Visit</dt>
              <dd>
                {row.visitId ? (
                  <Link
                    to={`/analytics/visits/${row.visitId}`}
                    className="text-indigo-600 hover:underline"
                  >
                    #{row.visitId}
                  </Link>
                ) : (
                  '—'
                )}
                {row.postbackId ? (
                  <>
                    {' · '}
                    <Link
                      to={`/postbacks/${row.postbackId}`}
                      className="text-indigo-600 hover:underline"
                    >
                      postback #{row.postbackId}
                    </Link>
                  </>
                ) : null}
              </dd>
            </div>
          </dl>
          {row.vendorUrl ? (
            <p className="text-[11px] font-mono text-gray-600 break-all">URL: {row.vendorUrl}</p>
          ) : null}
          {row.vendorError ? (
            <p className="text-xs text-rose-600 whitespace-pre-wrap">{row.vendorError}</p>
          ) : null}
          {row.timeline?.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Timeline (logs)
              </p>
              <ul className="space-y-1">
                {row.timeline.map((ev, idx) => (
                  <li
                    key={`${ev.type}-${idx}-${ev.at}`}
                    className="text-xs border border-gray-100 rounded-lg px-3 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5"
                  >
                    <span className="text-gray-400 whitespace-nowrap">{formatDate(ev.at)}</span>
                    <span className="font-mono font-medium text-indigo-700">{ev.type}</span>
                    <span className={ev.ok === false ? 'text-rose-600' : 'text-gray-600'}>
                      {ev.detail}
                    </span>
                    {ev.url ? (
                      <span className="font-mono text-gray-400 break-all w-full"> {ev.url}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No api_call_logs / visit_events on this date.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default memo(NumberCard)
