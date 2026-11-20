import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react'
import { statusClass, getRequestPayload } from '../sessionDetailHelpers'
import { JsonBlock } from './JsonBlock'
import { formatDate } from '../../../utils/date'

export function ApiCallCard({ call, defaultOpen }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [copiedUrl, setCopiedUrl] = useState(false)
  const summary = call.summary || {}

  const handleCopyUrl = useCallback(() => {
    if (!call.requestUrl) return
    navigator.clipboard.writeText(call.requestUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }, [call.requestUrl])

  const httpStatus = call.responseStatus
  const isHttpOk = httpStatus != null && httpStatus >= 200 && httpStatus < 300

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="text-xs font-black uppercase tracking-wide text-gray-800">
            {call.eventType?.replace(/_/g, ' ')}
          </span>
          {call.statusLabel && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(
                call.statusLabel,
              )}`}
            >
              {call.statusLabel}
            </span>
          )}
          {httpStatus != null && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                isHttpOk
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              HTTP {httpStatus}
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-gray-400 shrink-0">
          {call.createdAt ? formatDate(call.createdAt) : '—'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4 pt-3">
          {(call.callType === 'checksub' ||
            call.callType === 'priority' ||
            call.callType === 'subscribe' ||
            String(call.callType || '').startsWith('orange_bf')) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/70 p-3 rounded-lg border border-gray-100">
              {call.callType === 'priority' && summary.priority != null && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">priority</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">
                    #{summary.priority}
                    {summary.pageType ? ` · ${summary.pageType}` : ''}
                  </p>
                </div>
              )}
              {call.callType === 'subscribe' && summary.pack ? (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">pack</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">
                    {summary.pack}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">currentStatus</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">
                  {summary.currentStatus || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">subscriptionStatus</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">
                  {summary.subscriptionStatus || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">serviceId</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">
                  {summary.serviceId || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">responseCode</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">
                  {summary.responseCode != null
                    ? String(summary.responseCode)
                    : httpStatus != null
                      ? String(httpStatus)
                      : '—'}
                </p>
              </div>
            </div>
          )}

          {summary.responseMessage && (
            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-2">
              {summary.responseMessage}
            </p>
          )}

          {call.errorMessage && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold">Error: </span>
                <span>{call.errorMessage}</span>
              </div>
            </div>
          )}

          {/* Request Section */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  REQ
                </span>
                <span className="text-xs font-bold text-gray-800">Request</span>
              </div>
              {call.msisdn && (
                <span className="text-[11px] font-mono text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
                  MSISDN: <span className="font-semibold text-gray-900">{call.msisdn}</span>
                </span>
              )}
            </div>

            {call.requestUrl && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Request URL</span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 break-all bg-white rounded-md p-2 border border-indigo-100 select-all">
                  {call.requestUrl}
                </p>
              </div>
            )}

            <JsonBlock
              value={getRequestPayload(call)}
              label="Request Body / Parameters"
              fallbackText={
                call.requestUrl
                  ? 'No body payload or parameters recorded'
                  : 'No request payload recorded'
              }
            />
          </div>

          {/* Response Section */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isHttpOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  RES
                </span>
                <span className="text-xs font-bold text-gray-800">Response</span>
              </div>
              {httpStatus != null && (
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    isHttpOk
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  HTTP {httpStatus}
                </span>
              )}
            </div>

            <JsonBlock
              value={call.responseBody}
              label="Response Body"
              fallbackText={
                call.errorMessage
                  ? `No response body received (${call.errorMessage})`
                  : 'No response body recorded'
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiCallCard
