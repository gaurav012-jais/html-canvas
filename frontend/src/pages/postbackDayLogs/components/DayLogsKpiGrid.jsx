import {
  CheckCircle2,
  Clock,
  HardDrive,
  Phone,
  Send,
  XCircle,
} from 'lucide-react'
import Kpi from './Kpi'

export default function DayLogsKpiGrid({
  summary,
  file,
  applyView,
  applyFilter,
  applyHitFilter,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('all')
        }}
      >
        <Kpi label="Callback hits" value={summary?.totalHits} icon={Clock} />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('numbers')
          applyFilter('all')
        }}
      >
        <Kpi
          label="Unique numbers"
          value={summary?.uniqueNumbers}
          hint={file?.uniqueNumbers ? `day total: ${file.uniqueNumbers}` : null}
          icon={HardDrive}
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => {
          applyView('hits')
          applyHitFilter('matched')
        }}
      >
        <Kpi
          label="Visit matched"
          value={summary?.matched}
          hint="found by click_id or rcid"
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
          value={summary?.unmatched}
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
