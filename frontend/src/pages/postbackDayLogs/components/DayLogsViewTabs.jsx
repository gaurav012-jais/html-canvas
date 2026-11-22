import { Search } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { FILTERS, HIT_FILTERS, VIEWS } from '../dayLogConstants'

export default function DayLogsViewTabs({
  view,
  applyView,
  filter,
  applyFilter,
  hitFilter,
  applyHitFilter,
  searchDraft,
  setSearchDraft,
  applySearch,
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => applyView(v.id)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
              view === v.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-gray-50/60 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(view === 'hits' ? HIT_FILTERS : FILTERS).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => (view === 'hits' ? applyHitFilter(f.id) : applyFilter(f.id))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (view === 'hits' ? hitFilter : filter) === f.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex gap-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-full sm:w-64"
            placeholder="msisdn / click / rcid — Enter"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch(searchDraft)
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => applySearch(searchDraft)}
          >
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}
