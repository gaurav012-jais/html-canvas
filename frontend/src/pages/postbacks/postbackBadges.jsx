export function operatorStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (s === 'active' || s === 'success' || s === 'subscribed') return `${base} bg-emerald-50 text-emerald-700`
  if (s === 'grace' || s === 'parking') return `${base} bg-amber-50 text-amber-800`
  if (s.includes('unsub') || s === 'cancel' || s === 'cancelled') return `${base} bg-slate-100 text-slate-600`
  if (!s) return `${base} bg-slate-100 text-slate-400`
  return `${base} bg-indigo-50 text-indigo-700`
}

export function delayedChecksubBadge(status, outcome) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold'
  const out = String(outcome || '').toUpperCase()
  if (out === 'ACTIVE' || (status === 'completed' && out === 'ACTIVE')) {
    return <span className={`${base} bg-emerald-50 text-emerald-700`}>✓ ACTIVE</span>
  }
  if (out === 'GRACE') {
    return <span className={`${base} bg-amber-50 text-amber-800`}>⚡ GRACE</span>
  }
  if (out === 'PARKING') {
    return <span className={`${base} bg-orange-50 text-orange-800`}>⊘ PARKING</span>
  }
  if (out === 'PENDING' && status !== 'pending') {
    return <span className={`${base} bg-amber-50 text-amber-800`}>⏱ PENDING</span>
  }
  if (out === 'SUSPENDED') {
    return <span className={`${base} bg-rose-50 text-rose-800`}>✕ SUSPENDED</span>
  }
  if (status === 'pending') {
    return <span className={`${base} bg-amber-50 text-amber-700`}>⏱ Pending</span>
  }
  if (status === 'failed' || out) {
    return <span className={`${base} bg-rose-50 text-rose-700`}>✕ {outcome || 'Failed'}</span>
  }
  return <span className="text-xs text-gray-400">—</span>
}

export function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  if (s === 'sent') return `${base} bg-emerald-50 text-emerald-700`
  if (s === 'received') return `${base} bg-sky-50 text-sky-700`
  if (s === 'pending') return `${base} bg-amber-50 text-amber-700`
  if (s === 'failed') return `${base} bg-rose-50 text-rose-700`
  if (s === 'skipped') return `${base} bg-slate-100 text-slate-600`
  return `${base} bg-slate-100 text-slate-700`
}
