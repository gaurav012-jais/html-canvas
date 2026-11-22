import { formatDate } from '../../../utils/date'

export function PostbackRelatedLogsCard({ logs }) {
  if (!logs || logs.length === 0) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">Related API logs</h2>
      <ul className="space-y-2">
        {logs.map((l) => (
          <li
            key={l.id}
            className="text-xs border border-gray-100 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1"
          >
            <span className="font-mono font-medium text-indigo-700">{l.callType}</span>
            <span className="text-gray-500">{formatDate(l.createdAt)}</span>
            {l.responseStatus != null ? (
              <span className="text-gray-600">HTTP {l.responseStatus}</span>
            ) : null}
            {l.success === false ? (
              <span className="text-rose-600">{l.errorMessage || 'failed'}</span>
            ) : null}
            {l.requestUrl ? (
              <span className="font-mono text-gray-700 break-all">{l.requestUrl}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
