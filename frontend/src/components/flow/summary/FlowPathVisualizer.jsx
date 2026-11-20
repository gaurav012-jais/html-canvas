import { memo } from 'react'
import { ArrowRight } from 'lucide-react'

export function FlowPathVisualizer({
  summary,
  labelFor,
  funnelLayout,
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-muted/40 px-3.5 py-3">
      <p className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-2">
        Path at a glance
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {summary.steps.map((step, idx) => (
          <span key={step.id} className="inline-flex items-center gap-1.5">
            {idx > 0 && <ArrowRight className="w-3 h-3 text-fg-subtle shrink-0" />}
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-bg-elevated border border-border text-fg">
              {labelFor(step.label) !== step.label ? labelFor(step.label) : step.label}
            </span>
          </span>
        ))}
      </div>

      {summary.edges.length > 0 && (
        <ul className="mt-3 space-y-1">
          {summary.edges
            .filter((e) => ['HOME', 'OTP'].includes(e.source))
            .map((e) => (
              <li
                key={`${e.source}-${e.condition}-${e.target}`}
                className="text-[11px] text-fg-muted"
              >
                <span className="font-mono text-fg">{labelFor(e.source)}</span>
                <span className="mx-1.5 text-fg-subtle">—{e.conditionLabel}→</span>
                <span className="font-mono text-fg">{labelFor(e.target)}</span>
              </li>
            ))}
        </ul>
      )}

      <p className="text-[11px] text-fg-subtle mt-2.5">{summary.note}</p>
      {funnelLayout === 'packs_on_home' && (
        <p className="text-[11px] text-fg-muted mt-1.5 leading-snug">
          Checks before Home: identity runs before the first content page. After OTP
          (when used) the next page is Home. Pack buttons subscribe from any page.
        </p>
      )}
    </div>
  )
}

export default memo(FlowPathVisualizer)
