import { Clock, ExternalLink, Phone, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../../../utils/date'
import { PostbackDetailField } from './PostbackDetailField'

function getDelayedChecksubBadgeClass(outcome, status) {
  const upper = String(outcome || '').toUpperCase()
  if (upper === 'ACTIVE') return 'bg-emerald-50 text-emerald-700'
  if (upper === 'GRACE') return 'bg-amber-50 text-amber-800'
  if (upper === 'PARKING') return 'bg-orange-50 text-orange-800'
  if (upper === 'SUSPENDED') return 'bg-rose-50 text-rose-800'
  if (status === 'pending') return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

function getDelayedChecksubLabel(outcome, status) {
  const upper = String(outcome || '').toUpperCase()
  if (upper === 'ACTIVE') return '✓ ACTIVE'
  if (upper === 'GRACE') return '⚡ GRACE'
  if (upper === 'PARKING') return '⊘ PARKING'
  if (upper === 'SUSPENDED') return '✕ SUSPENDED'
  if (status === 'pending') return '⏱ Pending'
  return `✕ ${outcome || 'Failed'}`
}

export function PostbackAttributionCard({ data }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">Attribution</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PostbackDetailField label="MSISDN">
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            {data.msisdn}
          </span>
        </PostbackDetailField>
        <PostbackDetailField label="Operator callback">
          <span className="font-medium">{data.operatorStatus || '—'}</span>
        </PostbackDetailField>
        <PostbackDetailField label="30m Delayed CheckSub">
          {data.delayedChecksubStatus ? (
            <div className="space-y-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getDelayedChecksubBadgeClass(
                  data.delayedChecksubOutcome,
                  data.delayedChecksubStatus,
                )}`}
              >
                {getDelayedChecksubLabel(data.delayedChecksubOutcome, data.delayedChecksubStatus)}
              </span>
              {data.delayedChecksubExecutedAt && (
                <div className="text-[11px] text-gray-400 font-mono">
                  {formatDate(data.delayedChecksubExecutedAt)}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </PostbackDetailField>
        <PostbackDetailField label="Vendor postback">
          <span className="font-medium">{data.status}</span>
        </PostbackDetailField>
        <PostbackDetailField label="Vendor">
          <span className="inline-flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-gray-400" />
            {data.vendorName || '—'}
            {data.vendorCode ? (
              <span className="text-xs text-gray-400 font-mono">({data.vendorCode})</span>
            ) : null}
          </span>
        </PostbackDetailField>
        <PostbackDetailField label="Visit">
          {data.visitId ? (
            <Link
              to={`/analytics/visits/${data.visitId}`}
              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
            >
              #{data.visitId}
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            '—'
          )}
        </PostbackDetailField>
        <PostbackDetailField label="click_id">
          <span className="font-mono text-xs">{data.clickId}</span>
        </PostbackDetailField>
        <PostbackDetailField label="rcid">
          <span className="font-mono text-xs">{data.rcid}</span>
        </PostbackDetailField>
        <PostbackDetailField label="campid (vendor)">
          <span className="font-mono text-xs">{data.campid}</span>
        </PostbackDetailField>
        <PostbackDetailField label="tracking_campid">
          <span className="font-mono text-xs">{data.trackingCampid}</span>
        </PostbackDetailField>
        <PostbackDetailField label="Offer / Campaign">
          {data.campaignName ? (
            <span className="font-medium text-gray-900">
              {data.campaignName}
              {data.campaignId ? ` (#${data.campaignId})` : ''}
            </span>
          ) : data.campaignId ? (
            `Campaign #${data.campaignId}`
          ) : (
            '—'
          )}
        </PostbackDetailField>
        {data.offerCode ? (
          <PostbackDetailField label="offer_code">
            <span className="font-mono text-xs">{data.offerCode}</span>
          </PostbackDetailField>
        ) : null}
        <PostbackDetailField label="Updated">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {formatDate(data.updatedAt)}
          </span>
        </PostbackDetailField>
      </dl>
    </div>
  )
}
