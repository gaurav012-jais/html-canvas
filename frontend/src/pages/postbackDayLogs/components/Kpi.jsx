import { memo } from 'react'

function Kpi({ label, value, hint, icon: Icon }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{value ?? 0}</p>
          {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default memo(Kpi)
