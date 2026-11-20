import { formatChartLabel } from '../../utils/date'

export const DASHBOARD_DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
]

export const EVENT_COLOR_MAP = {
  VISIT: '#3b82f6',
  OTP_SEND: '#f59e0b',
  OTP_VERIFY: '#8b5cf6',
  SUBSCRIBE_SUCCESS: '#059669',
  SUBSCRIBE_FAILED: '#ef4444',
}

export const FUNNEL_FROM_STATS = [
  { key: 'VISIT', label: 'Visits', field: 'visits', color: EVENT_COLOR_MAP.VISIT },
  { key: 'OTP_SEND', label: 'OTP sent', field: 'otpSend', color: EVENT_COLOR_MAP.OTP_SEND },
  { key: 'OTP_VERIFY', label: 'OTP verified', field: 'otpVerify', color: EVENT_COLOR_MAP.OTP_VERIFY },
  { key: 'SUBSCRIBE_SUCCESS', label: 'Subscribe success', field: 'subscribeSuccess', color: EVENT_COLOR_MAP.SUBSCRIBE_SUCCESS },
  { key: 'SUBSCRIBE_FAILED', label: 'Subscribe failed', field: 'subscribeFailed', color: EVENT_COLOR_MAP.SUBSCRIBE_FAILED },
]

export function operatorBarColor(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'success' || s === 'ok' || s === 'subscribed' || s === 'true' || s === '1') {
    return '#10b981'
  }
  if (s === 'grace' || s === 'parking' || s === 'low_balance' || s === 'pending') {
    return '#f59e0b'
  }
  if (s.includes('unsub') || s === 'cancel' || s === 'cancelled' || s === 'inactive') {
    return '#64748b'
  }
  if (s === 'failed' || s === 'false' || s === 'error' || s === 'unmatched') {
    return '#ef4444'
  }
  return '#6366f1'
}

export const getEventTypeBadgeClass = (eventType) => {
  const t = String(eventType).toUpperCase()
  if (t.includes('SUCCESS') || t.includes('VERIFIED')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
  }
  if (t.includes('FAIL') || t.includes('BLOCKED') || t.includes('ERROR')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/60'
  }
  if (t.includes('OTP') || t.includes('PENDING')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60'
  }
  if (t.includes('CLICK')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
  }
  return 'bg-slate-50 text-slate-700 border-slate-200/60'
}

export const getOperatorStatusBadgeClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'success' || s === 'ok' || s === 'subscribed' || s === 'true' || s === '1') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
  }
  if (s === 'grace' || s === 'parking' || s === 'low_balance' || s === 'pending') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
  }
  if (s.includes('unsub') || s === 'cancel' || s === 'cancelled' || s === 'inactive') {
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
  if (s === 'failed' || s === 'false' || s === 'error' || s === 'unmatched') {
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
  }
  return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
}

export const getStatusBadgeClass = (status) => {
  const s = String(status).toUpperCase()
  if (s === 'ACTIVE' || s.includes('SUCCESS') || s.includes('SUBSCRIBED')) {
    return 'bg-emerald-50 text-emerald-600 border-emerald-200'
  }
  if (s === 'PENDING' || s === 'INACTIVE' || s === 'NEW') {
    return 'bg-amber-50 text-amber-600 border-amber-200'
  }
  if (s.includes('FAILED') || s.includes('BLOCKED')) {
    return 'bg-rose-50 text-rose-600 border-rose-200'
  }
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

export const CustomTooltip = ({ active, payload, label, hourly }) => {
  if (active && payload && payload.length) {
    const displayLabel = payload[0]?.payload?.label || (label != null ? formatChartLabel(label, { hourly }) : '')
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="text-[11px] font-medium text-slate-400">{displayLabel}</p>
        <div className="mt-2 space-y-1">
          {payload.map((item, idx) => (
            <p key={idx} className="text-xs font-semibold flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: item.color || item.fill }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                {item.name}:
              </span>
              <span className="font-mono text-slate-200">{item.value?.toLocaleString()}</span>
            </p>
          ))}
        </div>
      </div>
    )
  }
  return null
}
