import { memo } from 'react'
import {
  Phone,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
} from 'lucide-react'
import KpiCard from './KpiCard'
import { operatorStatusBadge } from '../postbackBadges'

function PostbackKpiGrid({
  summary,
  operatorStatus,
  logsQuery,
  navigate,
  onSelectOperatorStatus,
}) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="MSISDN resolved"
          value={summary?.msisdnResolved}
          icon={Phone}
          hint="Visits with phone"
        />
        <button
          type="button"
          className="text-left"
          onClick={() => navigate(logsQuery({ filter: 'he_fail_cg' }))}
        >
          <KpiCard
            label="No MSISDN → CG"
            value={summary?.heFailCg}
            icon={XCircle}
            hint="Open logs filter"
          />
        </button>
        <KpiCard
          label="Postbacks created"
          value={summary?.postbacksCreated}
          icon={Send}
        />
        <KpiCard label="Pending" value={summary?.pending} icon={Clock} />
        <KpiCard
          label="Received"
          value={summary?.received}
          icon={Inbox}
          hint="Operator callback"
        />
        <KpiCard label="Sent to vendor" value={summary?.sent} icon={CheckCircle2} />
        <KpiCard label="Failed" value={summary?.failed} icon={XCircle} />
      </div>

      {summary?.byOperatorStatus?.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">
            Operator callback mix
          </h2>
          <div className="flex flex-wrap gap-2">
            {summary.byOperatorStatus.map((row) => (
              <button
                key={row.status}
                type="button"
                onClick={() => onSelectOperatorStatus(row.status)}
                className={`${operatorStatusBadge(row.status)} gap-1.5 ${
                  operatorStatus === row.status ? 'ring-2 ring-indigo-300' : ''
                }`}
              >
                {row.status}
                <span className="font-mono tabular-nums">{row.count}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {summary.callbacksReceived || 0} callbacks in range · vendor fire is separate
            (pending / sent / failed above)
          </p>
        </div>
      ) : null}
    </>
  )
}

export default memo(PostbackKpiGrid)
