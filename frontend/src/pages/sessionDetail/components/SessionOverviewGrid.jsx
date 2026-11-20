import { memo } from 'react'
import { User, Globe, Terminal } from 'lucide-react'
import { statusClass } from '../sessionDetailHelpers'

export function SessionOverviewGrid({ visit }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
      <div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <User className="w-3.5 h-3.5" /> Subscriber
        </span>
        <p className="font-mono font-semibold text-gray-800 mt-1">
          {visit?.phone || visit?.phoneMasked || 'Anonymous'}
        </p>
      </div>
      <div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" /> Geo &amp; Carrier
        </span>
        <p className="font-semibold text-gray-800 mt-1">
          {visit?.country || '—'} / {visit?.operator || '—'}
        </p>
      </div>
      <div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Traffic origin
        </span>
        <p className="font-semibold text-gray-800 mt-1 truncate">
          {visit?.vidRaw ? `Vendor: ${visit.vidRaw}` : 'Direct'}
        </p>
      </div>
      <div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
        <p className="mt-1">
          <span
            className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(
              visit?.visitStatus,
            )}`}
          >
            {visit?.visitStatus || '—'}
          </span>
        </p>
      </div>
      {visit?.checksubStatus && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            30m CheckSub
          </span>
          <p className="mt-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass(
                visit.checksubStatus,
              )}`}
            >
              {visit.checksubStatus === 'ACTIVE' ? '✓ ACTIVE' : visit.checksubStatus}
            </span>
          </p>
        </div>
      )}
      {visit?.ipAddress && (
        <div className="col-span-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" /> Network IP
          </span>
          <p className="font-mono text-gray-700 mt-1">{visit.ipAddress}</p>
        </div>
      )}
      {visit?.clickId && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Click ID</span>
          <p className="font-mono text-indigo-600 mt-1 break-all">{visit.clickId}</p>
        </div>
      )}
      {visit?.rcid && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RCID</span>
          <p className="font-mono text-gray-700 mt-1 break-all">{visit.rcid}</p>
        </div>
      )}
      {visit?.campid && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campid</span>
          <p className="font-mono text-gray-700 mt-1 break-all">{visit.campid}</p>
        </div>
      )}
      {visit?.trackingCampid && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Tracking ID
          </span>
          <p className="font-mono text-gray-700 mt-1 break-all">{visit.trackingCampid}</p>
        </div>
      )}
      {visit?.userAgent && (
        <div className="col-span-2 md:col-span-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            User Agent
          </span>
          <p className="text-gray-600 mt-1 break-all">{visit.userAgent}</p>
        </div>
      )}
    </div>
  )
}

export default memo(SessionOverviewGrid)
