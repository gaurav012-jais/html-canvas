import { memo } from 'react'
import {
  inputClass,
  Field,
  PageSelect,
  DestinationFields,
  ensureApiRules,
} from './priorityChainHelpers'

export function PriorityChainStepCard({
  idx,
  step,
  actionsLength,
  dragOverIdx,
  setDragOverIdx,
  dragFromRef,
  reorderStep,
  moveStep,
  removeStep,
  updateStep,
  updateRule,
  addRule,
  removeRule,
  sectionOptions,
  saveActions,
  actions,
}) {
  const apiStep = step.type === 'api' ? ensureApiRules(step) : step
  const rules = apiStep.type === 'api' ? apiStep.rules || [] : []

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOverIdx !== idx) setDragOverIdx(idx)
      }}
      onDragLeave={() => {
        if (dragOverIdx === idx) setDragOverIdx(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        const from =
          dragFromRef.current ??
          Number.parseInt(e.dataTransfer.getData('text/plain'), 10)
        setDragOverIdx(null)
        dragFromRef.current = null
        if (Number.isFinite(from)) reorderStep(from, idx)
      }}
      className={`rounded-xl border bg-bg-muted/30 p-4 space-y-3 transition-colors ${
        dragOverIdx === idx
          ? 'border-indigo-400 ring-2 ring-indigo-200'
          : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-indigo-600 flex items-center gap-2">
          <span
            draggable
            title="Drag to reorder"
            onDragStart={(e) => {
              dragFromRef.current = idx
              setDragOverIdx(idx)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(idx))
            }}
            onDragEnd={() => {
              dragFromRef.current = null
              setDragOverIdx(null)
            }}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-border bg-bg text-fg-muted cursor-grab active:cursor-grabbing select-none text-[10px] tracking-tighter"
            aria-label={`Drag step ${idx + 1} to reorder`}
          >
            ⋮⋮
          </span>
          Step {idx + 1}
        </span>
        <div className="flex items-center gap-1">
          {idx > 0 && (
            <button
              type="button"
              onClick={() => moveStep(idx, 'up')}
              className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-bg"
            >
              ↑
            </button>
          )}
          {idx < actionsLength - 1 && (
            <button
              type="button"
              onClick={() => moveStep(idx, 'down')}
              className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-bg"
            >
              ↓
            </button>
          )}
          {actionsLength > 1 && (
            <button
              type="button"
              onClick={() => removeStep(idx)}
              className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <Field label="What should this step do?">
        <select
          className={inputClass}
          value={step.type}
          onChange={(e) => updateStep(idx, 'type', e.target.value)}
        >
          <option value="api">Check a status URL</option>
          <option value="page">Go to another page</option>
          <option value="external">Open a website</option>
          <option value="anchor">Scroll to a section</option>
          <option value="flow">Continue signup flow</option>
        </select>
      </Field>

      {step.type === 'api' && (
        <>
          <Field label="Status check URL">
            <input
              className={inputClass}
              placeholder="https://example.com/checksub?msisdn={{msisdn}}&serviceId=WELLNESS"
              value={step.url || ''}
              onChange={(e) => updateStep(idx, 'url', e.target.value)}
            />
          </Field>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-fg">Where to go for each status</p>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  First match wins. Example: currentStatus = parking → Low balance
                </p>
              </div>
              <button
                type="button"
                onClick={() => addRule(idx)}
                className="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50"
              >
                + Add status
              </button>
            </div>

            <div className="space-y-2">
              {rules.map((rule, rIdx) => (
                <div
                  key={rIdx}
                  className="rounded-lg border border-border bg-bg p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-600">
                      Rule {rIdx + 1}
                    </span>
                    <button
                      type="button"
                      title="Remove this rule"
                      disabled={rules.length <= 1}
                      onClick={() => removeRule(idx, rIdx)}
                      className="px-2 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field label="Response field">
                      <input
                        className={inputClass}
                        placeholder="currentStatus"
                        value={rule.key || ''}
                        onChange={(e) => updateRule(idx, rIdx, 'key', e.target.value)}
                      />
                    </Field>
                    <Field label="Equals">
                      <input
                        className={inputClass}
                        placeholder="parking"
                        value={rule.value || ''}
                        onChange={(e) => updateRule(idx, rIdx, 'value', e.target.value)}
                      />
                    </Field>
                  </div>
                  <DestinationFields
                    go={rule.go || 'page'}
                    page={rule.page || 'THANKYOU'}
                    url={rule.url || ''}
                    goLabel="Then go to"
                    onGoChange={(go) => updateRule(idx, rIdx, 'go', go)}
                    onPageChange={(pageId) => updateRule(idx, rIdx, 'page', pageId)}
                    onUrlChange={(u) => updateRule(idx, rIdx, 'url', u)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
              <Field label="If nothing matches">
                <select
                  className={inputClass}
                  value={
                    step.missAction === 'external'
                      ? 'external'
                      : step.missAction === 'page'
                        ? 'page'
                        : 'continue'
                  }
                  onChange={(e) => {
                    const next = [...actions]
                    const updated = { ...next[idx], missAction: e.target.value }
                    if (e.target.value === 'page' && !updated.missPage) {
                      updated.missPage = 'ERROR'
                    }
                    if (e.target.value === 'external' && !updated.missUrl) {
                      updated.missUrl = 'https://'
                    }
                    next[idx] = updated
                    saveActions(next)
                  }}
                >
                  <option value="continue">Try the next step</option>
                  <option value="page">Go to a page</option>
                  <option value="external">Open a website</option>
                </select>
              </Field>
              {step.missAction === 'page' && (
                <PageSelect
                  label="Which page"
                  value={step.missPage || 'ERROR'}
                  onChange={(pageId) => updateStep(idx, 'missPage', pageId)}
                />
              )}
              {step.missAction === 'external' && (
                <Field label="Website URL">
                  <input
                    className={inputClass}
                    placeholder="https://example.com"
                    value={step.missUrl || ''}
                    onChange={(e) => updateStep(idx, 'missUrl', e.target.value)}
                  />
                </Field>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
              <Field label="If the check fails to load">
                <select
                  className={inputClass}
                  value={
                    step.failAction === 'external'
                      ? 'external'
                      : step.failAction === 'page'
                        ? 'page'
                        : 'continue'
                  }
                  onChange={(e) => {
                    const next = [...actions]
                    const updated = { ...next[idx], failAction: e.target.value }
                    if (e.target.value === 'page' && !updated.failPage) {
                      updated.failPage = 'ERROR'
                    }
                    if (e.target.value === 'external' && !updated.failUrl) {
                      updated.failUrl = 'https://'
                    }
                    next[idx] = updated
                    saveActions(next)
                  }}
                >
                  <option value="continue">Try the next step</option>
                  <option value="page">Go to a page</option>
                  <option value="external">Open a website</option>
                </select>
              </Field>
              {step.failAction === 'page' && (
                <PageSelect
                  label="Which page"
                  value={step.failPage || 'ERROR'}
                  onChange={(pageId) => updateStep(idx, 'failPage', pageId)}
                />
              )}
              {step.failAction === 'external' && (
                <Field label="Website URL">
                  <input
                    className={inputClass}
                    placeholder="https://example.com"
                    value={step.failUrl || ''}
                    onChange={(e) => updateStep(idx, 'failUrl', e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>
        </>
      )}

      {step.type === 'page' && (
        <PageSelect
          label="Which page"
          value={step.page || 'OTP'}
          onChange={(pageId) => updateStep(idx, 'page', pageId)}
        />
      )}

      {step.type === 'external' && (
        <Field label="Website URL">
          <input
            className={inputClass}
            placeholder="https://example.com"
            value={step.url || ''}
            onChange={(e) => updateStep(idx, 'url', e.target.value)}
          />
        </Field>
      )}

      {step.type === 'anchor' && (
        <Field label="Scroll to section">
          <select
            className={inputClass}
            value={step.section || ''}
            onChange={(e) => updateStep(idx, 'section', e.target.value)}
          >
            <option value="">Select a section...</option>
            {sectionOptions.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label} (#{sec.id})
              </option>
            ))}
          </select>
        </Field>
      )}

      {step.type === 'flow' && (
        <p className="text-[11px] text-fg-muted">
          Continues the normal signup path from Flow Builder.
        </p>
      )}
    </div>
  )
}

export default memo(PriorityChainStepCard)
