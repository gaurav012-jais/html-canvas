import { memo } from 'react'
import { Calendar } from 'lucide-react'
import {
  getEventIcon,
  statusClass,
  eventDescription,
  eventPack,
  eventChip,
  parseJsonish,
  billingSkipFromPayload,
  getRequestPayload,
} from '../sessionDetailHelpers'
import { JsonBlock } from './JsonBlock'
import { formatDate } from '../../../utils/date'

export function TimelineItemCard({ item, apiById, visit }) {
  const apiCall = item.kind === 'api' ? apiById.get(item.apiCallId) : null
  const label =
    item.kind === 'api'
      ? apiCall?.statusLabel || item.metadata?.statusLabel
      : item.eventType === 'CHECKSUB_30M'
        ? item.metadata?.status || (item.metadata?.success ? 'ACTIVE' : 'FAILED')
        : item.metadata?.held
          ? 'HELD'
          : item.metadata?.status || item.metadata?.operatorStatus || visit?.visitStatus
  const desc = eventDescription(item.eventType)
  const pack = eventPack(item.metadata)
  const billingBody = parseJsonish(apiCall?.requestBody)
  const skipCopy =
    billingSkipFromPayload(item.metadata) ||
    billingSkipFromPayload(billingBody) ||
    (item.eventType === 'CALLBACK_RECEIVED'
      ? billingSkipFromPayload(parseJsonish(apiCall?.requestBody))
      : null)
  const rawInfo = item.kind === 'event' ? item.metadata?.info : ''
  const hideFiringInfo = String(rawInfo).includes('firing vendor postback') && skipCopy
  const eventInfo = skipCopy || (hideFiringInfo ? '' : rawInfo)
  const serviceId = eventChip(item.metadata, 'serviceId')
  const subServiceId = eventChip(item.metadata, 'subServiceId')

  return (
    <div className="relative pl-7">
      <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full border bg-white flex items-center justify-center shadow-xs">
        {getEventIcon(item.eventType, label)}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs hover:border-gray-300 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-gray-800">
              {(item.eventType || '—').replace(/_/g, ' ')}
            </span>
            {label && (
              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(label)}`}>
                {label}
              </span>
            )}
            {pack && (
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border text-indigo-700 bg-indigo-50 border-indigo-200">
                {pack}
              </span>
            )}
            {serviceId && (
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border text-slate-700 bg-slate-50 border-slate-200">
                {serviceId}
              </span>
            )}
            {subServiceId && (
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border text-violet-700 bg-violet-50 border-violet-200">
                {subServiceId}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {item.createdAt ? formatDate(item.createdAt) : '—'}
          </span>
        </div>
        {desc && <p className="text-xs text-gray-500 mt-1.5">{desc}</p>}
        {item.eventType === 'CHECKSUB_30M' && (
          <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">30-Minute Post-Conversion Operator Audit</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass(item.metadata?.status)}`}>
                {item.metadata?.status === 'ACTIVE'
                  ? '✓ ACTIVE (BILLED)'
                  : item.metadata?.status || (item.metadata?.success ? 'ACTIVE' : 'NON-ACTIVE')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 font-mono mt-1 pt-1 border-t border-gray-200">
              <div>Phone: <span className="font-semibold text-gray-800">{item.metadata?.phone || visit?.phone || '—'}</span></div>
              <div>Source: <span className="font-semibold text-gray-800">{item.metadata?.source || 'checksub'}</span></div>
            </div>
            <p className="text-[11px] mt-1">
              {item.metadata?.success ? (
                <span className="text-emerald-700 font-medium">✓ Subscriber is actively billed and confirmed with operator.</span>
              ) : (
                <span className="text-amber-800 font-medium">
                  ⚠ Operator returned non-active state ({item.metadata?.status || 'unsubscribed'}). Vendor CPA quality audit flagged.
                </span>
              )}
            </p>
          </div>
        )}
        {(apiCall?.callType === 'checksub' ||
          apiCall?.callType === 'delayed_checksub' ||
          apiCall?.callType === 'priority') &&
          apiCall.summary && (
            <p className="text-xs text-gray-700 mt-1.5 font-medium">
              {apiCall.callType === 'priority' && apiCall.summary.priority != null && (
                <>priority=#{apiCall.summary.priority} · </>
              )}
              currentStatus={apiCall.summary.currentStatus || '—'}
              {' · '}
              subscriptionStatus={apiCall.summary.subscriptionStatus || '—'}
            </p>
          )}
        {item.kind === 'event' && eventInfo && (
          <p className={`text-xs mt-1 ${skipCopy ? 'text-amber-800 font-medium' : 'text-gray-600'}`}>
            {eventInfo}
          </p>
        )}
        {skipCopy && item.kind === 'api' && (
          <p className="text-xs text-amber-800 font-medium mt-1.5 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
            {skipCopy}
          </p>
        )}
        {item.kind === 'event' &&
          item.metadata?.vendorFired === false &&
          (item.metadata.allowedStatuses || item.metadata.receivedStatus) && (
            <p className="text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 mt-1.5">
              allowed: {item.metadata.allowedStatuses || '—'}
              {' · '}
              received: {item.metadata.receivedStatus || item.metadata.status || '—'}
            </p>
          )}
        {item.kind === 'event' && item.metadata?.url && (
          <p className="text-[11px] font-mono text-sky-700 mt-1 break-all">
            {item.metadata.url}
            {item.metadata.httpStatus != null ? ` · HTTP ${item.metadata.httpStatus}` : ''}
          </p>
        )}
        {item.kind === 'event' && item.metadata?.responseBody != null && (
          <JsonBlock label="Response" value={item.metadata.responseBody} />
        )}
        {item.kind === 'api' && apiCall?.requestUrl && (
          <p className="text-[11px] font-mono text-sky-700 mt-1 break-all">
            {apiCall.requestUrl}
            {apiCall.responseStatus != null ? ` · HTTP ${apiCall.responseStatus}` : ''}
          </p>
        )}
        {item.kind === 'api' && getRequestPayload(apiCall) != null && (
          <JsonBlock
            label="Request"
            value={
              skipCopy && billingBody
                ? {
                    ...billingBody,
                    reason: skipCopy,
                    matchPath:
                      billingBody.matchPath ||
                      (String(billingBody.reason || '').includes('click_id') ||
                      String(billingBody.reason || '').includes('msisdn')
                        ? billingBody.reason
                        : undefined),
                  }
                : getRequestPayload(apiCall)
            }
          />
        )}
        {item.kind === 'api' && apiCall?.responseBody != null && (
          <JsonBlock label="Response" value={apiCall.responseBody} />
        )}
        {item.kind === 'api' && apiCall?.errorMessage && (
          <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {apiCall.errorMessage}
          </p>
        )}
        {item.kind === 'event' && (item.metadata?.inboundUrl || item.metadata?.partnerUrl) && (
          <div className="mt-1 space-y-1">
            {item.metadata.inboundUrl && (
              <p className="text-[11px] font-mono text-sky-700 break-all">
                in: {item.metadata.inboundUrl}
              </p>
            )}
            {item.metadata.partnerUrl && (
              <p className="text-[11px] font-mono text-indigo-700 break-all">
                partner: {item.metadata.partnerUrl}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(TimelineItemCard)
