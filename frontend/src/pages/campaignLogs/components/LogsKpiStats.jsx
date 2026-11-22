import {
  Activity,
  Users,
  UserCheck,
  Percent,
  KeyRound,
  Shield,
  Database,
} from 'lucide-react'
import { StatCard } from './LogCards'

export function LogsKpiStats({
  totalEvents,
  logsTotal,
  aggs,
  selectedId,
  otpStats,
}) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Event Count" value={totalEvents} icon={Activity} colorClass="from-indigo-500 to-purple-500" />
        <StatCard label="Clicks in filter" value={logsTotal || 0} icon={Database} colorClass="from-blue-500 to-indigo-500" />
        <StatCard label="Unique Vendors" value={(aggs?.byVendor || []).length} icon={Users} colorClass="from-teal-500 to-emerald-500" />
        <StatCard label="Campaigns in view" value={selectedId === 'all' ? (aggs?.byCampaign || []).length || '—' : 1} icon={UserCheck} colorClass="from-amber-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="OTP requested"
          value={otpStats.requested}
          hint="Successful send"
          icon={KeyRound}
          colorClass="from-amber-500 to-orange-500"
        />
        <StatCard
          label="OTP verified"
          value={otpStats.verifiedLive}
          hint={`${otpStats.verifiedVendor} shown to vendor`}
          icon={KeyRound}
          colorClass="from-violet-500 to-indigo-500"
        />
        <StatCard
          label="Live conv %"
          value={`${otpStats.liveConvPercent}%`}
          hint="Verified / requested"
          icon={Percent}
          colorClass="from-emerald-500 to-teal-500"
        />
        <StatCard
          label="Vendor conv %"
          value={`${otpStats.vendorConvPercent}%`}
          hint="After hold, what vendor sees"
          icon={Percent}
          colorClass="from-sky-500 to-blue-500"
        />
        <StatCard
          label="Hold %"
          value={`${otpStats.holdPercent}%`}
          hint={`${otpStats.held} held of live verifies`}
          icon={Shield}
          colorClass="from-rose-500 to-orange-500"
        />
      </div>
    </>
  )
}
