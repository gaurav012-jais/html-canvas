export function PostbackDetailField({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-all">{children || '—'}</dd>
    </div>
  )
}
