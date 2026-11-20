import { memo } from 'react'
import { Layers, ListFilter } from 'lucide-react'
import { TimelineItemCard } from './TimelineItemCard'

export function SessionFlowTimeline({
  viewMode,
  setViewMode,
  flowSteps,
  rawTimeline,
  apiById,
  visit,
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Session flow &amp; execution logs</h2>
          <p className="text-xs text-gray-500">
            {viewMode === 'flow'
              ? 'Events and partner API calls grouped by sequential flow step.'
              : 'Flat chronological timeline of all session events and calls.'}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('flow')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'flow'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Flow Steps View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'timeline'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Timeline View
          </button>
        </div>
      </div>

      {viewMode === 'flow' ? (
        <div className="space-y-6">
          {flowSteps.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No flow events recorded.</p>
          ) : (
            flowSteps.map((step) => (
              <div
                key={step.stepKey}
                className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                      {step.stepIndex}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        {step.stepTitle}
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${step.badgeColor}`}
                        >
                          {step.badge}
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    {step.items.length} {step.items.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {step.items.map((item) => (
                    <TimelineItemCard
                      key={`${item.id}-${item.eventType}`}
                      item={item}
                      apiById={apiById}
                      visit={visit}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="relative pl-8 py-2">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200" />
          <div className="space-y-4">
            {(rawTimeline || []).map((item) => (
              <TimelineItemCard
                key={`${item.id}-${item.eventType}`}
                item={item}
                apiById={apiById}
                visit={visit}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default memo(SessionFlowTimeline)
