import {
  CheckCircle2,
  Clock,
  FileText,
  Phone,
  Send,
  XCircle,
} from 'lucide-react'
import Kpi from './Kpi'

export default function DayLogsKpiGrid({
  stats,
  summary,
  applyView,
  applyFilter,
  applyHitFilter,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-2">
      <Kpi
        label="Visits"
        value={stats?.totals?.visits}
        hint="Rolled-up daily stats"
        icon={Clock}
      />
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('all')
        }}
      >
        <Kpi
          label="Hits"
          value={summary?.hitCount ?? summary?.totalHits}
          hint="Every callback + fire"
          icon={FileText}
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('billing_callback')
        }}
      >
        <Kpi
          label="Callback hits"
          value={summary?.billingHits}
          icon={CheckCircle2}
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('unmatched')
        }}
      >
        <Kpi
          label="Unmatched"
          value={summary?.unmatched ?? summary?.callbackUnmatched}
          hint="click_id / msisdn not in system"
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('with_msisdn')
        }}
      >
        <Kpi label="Number received" value={summary?.withMsisdn} icon={Phone} />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('without_msisdn')
        }}
      >
        <Kpi label="Number missing" value={summary?.withoutMsisdn} />
      </button>
      <Kpi label="Vendor sent" value={summary?.vendorSent} icon={Send} />
      <Kpi label="Fire failed" value={summary?.hitFailed ?? summary?.vendorFailed} icon={XCircle} />
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('numbers')
          applyFilter('he_fail_cg')
        }}
      >
        <Kpi
          label="No MSISDN → CG"
          value={summary?.heFailCg}
          hint="HE resolve failed, sent to CG"
          icon={XCircle}
        />
      </button>
    </div>
  )
}
