import { getDatePartsInTimezone, DEFAULT_TIMEZONE } from '../../utils/date'

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'complete', label: 'Complete (recv + fired)' },
  { id: 'waiting_callback', label: 'Waiting callback' },
  { id: 'fire_failed', label: 'Fire failed' },
  { id: 'he_fail_cg', label: 'No MSISDN → CG' },
  { id: 'callback_unmatched', label: 'Unmatched callback' },
  { id: 'callback_no_row', label: 'Callback, no queue' },
  { id: 'not_queued', label: 'Not queued' },
]

export const HIT_FILTERS = [
  { id: 'all', label: 'All hits' },
  { id: 'billing_callback', label: 'Billing callback' },
  { id: 'vendor_postback', label: 'Vendor fire' },
  { id: 'ok', label: 'Passed' },
  { id: 'failed', label: 'Failed' },
  { id: 'unmatched', label: 'Unmatched' },
  { id: 'with_msisdn', label: 'Number received' },
  { id: 'without_msisdn', label: 'Number missing' },
]

export const FILTER_IDS = new Set(FILTERS.map((f) => f.id))
export const HIT_FILTER_IDS = new Set(HIT_FILTERS.map((f) => f.id))

export const VIEWS = [
  { id: 'hits', label: 'Every hit (datewise)' },
  { id: 'numbers', label: 'By number' },
]

export const GROUP_BY = [
  { id: 'date', label: 'By day' },
  { id: 'campaign', label: 'By campaign' },
  { id: 'vendor', label: 'By vendor' },
  { id: 'campaign_vendor', label: 'Campaign × vendor' },
]

export const PAGE_SIZE = 50

export const SELECT_CLASS =
  'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/40 text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500'

export function ymdOf(value, timezone) {
  if (!value) return 'unknown'
  try {
    return getDatePartsInTimezone(timezone || DEFAULT_TIMEZONE, new Date(value))
  } catch {
    return String(value).slice(0, 10) || 'unknown'
  }
}

export function groupByDate(rows, timezone, pickAt) {
  const groups = []
  const map = new Map()
  for (const row of rows) {
    const day = pickAt(row) || 'unknown'
    if (!map.has(day)) {
      const group = { date: day, rows: [] }
      map.set(day, group)
      groups.push(group)
    }
    map.get(day).rows.push(row)
  }
  return groups
}

export function rowKeyOf(row) {
  return row.rowKey || row.msisdn || (row.visitId ? `visit:${row.visitId}` : `click:${row.clickId || ''}`)
}

export function ynClass(ok, fail) {
  if (fail) return 'bg-rose-50 text-rose-700 border-rose-200'
  if (ok) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-amber-50 text-amber-800 border-amber-200'
}
