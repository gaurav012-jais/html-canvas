import { memo } from 'react'
import { Link } from 'react-router-dom'
import Flag from './Flag'
import { formatDate } from '../../../utils/date'

function HitRow({ hit }) {
  const fail = !hit.ok || hit.unmatched
  return (
    <div className="px-5 py-3 border-b border-gray-50 last:border-0 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
            {formatDate(hit.at)}
          </span>
          <span className="font-mono text-sm font-semibold text-gray-900">
            {hit.callType === 'vendor_postback' ? 'Vendor fire' : 'Billing callback'}
          </span>
          <Flag
            label={hit.statusLabel || (fail ? 'FAIL' : 'OK')}
            yes={hit.ok && !hit.unmatched}
            fail={fail}
          />
          <Flag
            label="Number"
            yes={Boolean(hit.msisdnReceived)}
            extra={hit.msisdn || 'no MSISDN'}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-600">
          {hit.msisdn ? (
            <span className="font-mono font-medium text-gray-800">{hit.msisdn}</span>
          ) : (
            <span className="text-amber-700">Number not received</span>
          )}
          {hit.clickId ? (
            <span className="font-mono text-gray-500"> · click {hit.clickId}</span>
          ) : null}
          {hit.visitId ? (
            <>
              {' · '}
              <Link
                to={`/analytics/visits/${hit.visitId}`}
                className="text-indigo-600 hover:underline"
              >
                visit #{hit.visitId}
              </Link>
            </>
          ) : null}
          {hit.http != null ? <span className="text-gray-400"> · HTTP {hit.http}</span> : null}
        </p>
        {hit.reason ? <p className="mt-1 text-xs text-rose-600">{hit.reason}</p> : null}
        {hit.url ? (
          <p className="mt-1 font-mono text-[11px] text-gray-400 break-all">{hit.url}</p>
        ) : null}
      </div>
    </div>
  )
}

export default memo(HitRow)
