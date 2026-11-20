import { formatChartLabel } from '../../../utils/date'

export function SectionCard({ title, children, actions, className = '' }) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden hover:border-gray-200/80 transition-all duration-300 ${className}`}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  colorClass = 'from-indigo-500 to-indigo-600',
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
      <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${colorClass}`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">{value}</p>
          {hint ? (
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{hint}</p>
          ) : null}
        </div>
        {Icon && (
          <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 text-gray-500 transition-all duration-300 group-hover:scale-110">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  )
}

export const CustomTooltip = ({ active, payload, label, hourly }) => {
  if (active && payload && payload.length) {
    const displayLabel =
      payload[0]?.payload?.label ||
      (label != null ? formatChartLabel(label, { hourly }) : '')
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-semibold text-gray-300">{displayLabel}</p>
        <div className="mt-1.5 space-y-1">
          {payload.map((entry) => (
            <p key={entry.dataKey || entry.name} className="text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              {entry.name || 'Events'}:{' '}
              <span className="font-mono text-indigo-300">{entry.value ?? 0}</span>
            </p>
          ))}
        </div>
      </div>
    )
  }
  return null
}
