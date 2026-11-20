import { useState, useEffect, useRef } from 'react'
import Modal from '../../components/common/Modal'
import { normalizeApiRules } from '../../services/flow/priorityApiMatch'
import {
  defaultApiStep,
  ensureApiRules,
} from './priorityChain/priorityChainHelpers'
import PriorityChainStepCard from './priorityChain/PriorityChainStepCard'

export {
  Field,
  PageSelect,
  DestinationFields,
} from './priorityChain/priorityChainHelpers'

/**
 * Full-screen-ish modal to configure Priority Chain (multi if/else status → page).
 */
export function PriorityChainModal({
  isOpen,
  onClose,
  selected,
  editor,
  update,
}) {
  const dragFromRef = useRef(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  if (!selected) return null

  const attrs = selected.getAttributes() || {}
  let actions = []
  try {
    actions = JSON.parse(attrs['data-actions'] || '[]')
  } catch {
    actions = []
  }

  if (actions.length === 0) {
    actions = [defaultApiStep(), { type: 'page', page: 'OTP' }]
  }

  const saveActions = (newActions) => {
    selected.addAttributes({
      'data-action': 'CHAIN',
      'data-actions': JSON.stringify(newActions),
      href: '#',
    })
    update()
  }

  const updateStep = (index, field, value) => {
    const next = [...actions]
    let updated = { ...next[index], [field]: value }
    if (field === 'type' && value === 'api') {
      updated = ensureApiRules({
        ...updated,
        missAction: updated.missAction || 'page',
        missPage: updated.missPage || 'ERROR',
        failAction: updated.failAction || 'page',
        failPage: updated.failPage || 'ERROR',
      })
    }
    next[index] = updated
    saveActions(next)
  }

  const updateRule = (stepIndex, ruleIndex, field, value) => {
    const next = [...actions]
    const step = ensureApiRules(next[stepIndex])
    const rules = [...(step.rules || [])]
    rules[ruleIndex] = { ...rules[ruleIndex], [field]: value }
    next[stepIndex] = { ...step, rules }
    saveActions(next)
  }

  const addRule = (stepIndex) => {
    const next = [...actions]
    const step = ensureApiRules(next[stepIndex])
    const rules = [
      ...(step.rules || []),
      { key: 'currentStatus', value: '', go: 'page', page: 'OTP', url: '' },
    ]
    next[stepIndex] = { ...step, rules }
    saveActions(next)
  }

  const removeRule = (stepIndex, ruleIndex) => {
    const next = [...actions]
    const step = ensureApiRules(next[stepIndex])
    const rules = (step.rules || []).filter((_, i) => i !== ruleIndex)
    next[stepIndex] = {
      ...step,
      rules:
        rules.length > 0
          ? rules
          : [{ key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' }],
    }
    saveActions(next)
  }

  const addStep = () => saveActions([...actions, { type: 'page', page: 'OTP' }])

  const removeStep = (index) => {
    if (actions.length <= 1) return
    saveActions(actions.filter((_, i) => i !== index))
  }

  const moveStep = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= actions.length) return
    const next = [...actions]
    const temp = next[index]
    next[index] = next[targetIndex]
    next[targetIndex] = temp
    saveActions(next)
  }

  const reorderStep = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= actions.length || toIndex >= actions.length) return
    const next = [...actions]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    saveActions(next)
  }

  const sectionOptions = (() => {
    const sections = []
    const wrapper = editor?.getWrapper?.()
    if (!wrapper) return sections
    const walk = (cmp) => {
      const tag = (cmp.get('tagName') || '').toLowerCase()
      const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article'])
      const isSection =
        SECTION_TAGS.has(tag) || cmp.getAttributes()?.['data-tc-type'] === 'section'
      if (isSection && tag !== 'header' && tag !== 'footer') {
        const id = cmp.getAttributes()?.id || cmp.getId()
        const label = cmp.get('sectionLabel') || id || 'Untitled Section'
        sections.push({ id, label })
      }
      cmp.components().forEach(walk)
    }
    walk(wrapper)
    return sections
  })()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Try checks in order"
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted leading-relaxed">
          Steps run top to bottom for this button. Drag the ⋮⋮ handle to reorder, or use ↑↓.
          For a status check, add rules like: if status = active → Thank you page.
          First match wins; later steps are skipped.
        </p>

        <div className="space-y-3">
          {actions.map((step, idx) => (
            <PriorityChainStepCard
              key={idx}
              idx={idx}
              step={step}
              actionsLength={actions.length}
              dragOverIdx={dragOverIdx}
              setDragOverIdx={setDragOverIdx}
              dragFromRef={dragFromRef}
              reorderStep={reorderStep}
              moveStep={moveStep}
              removeStep={removeStep}
              updateStep={updateStep}
              updateRule={updateRule}
              addRule={addRule}
              removeRule={removeRule}
              sectionOptions={sectionOptions}
              saveActions={saveActions}
              actions={actions}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="w-full py-2.5 px-3 border border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl text-sm text-indigo-600 font-semibold hover:bg-indigo-50/50 transition-colors"
        >
          + Add step
        </button>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-accent-fg hover:bg-accent-hover"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Compact trigger shown in the property panel. */
export function PriorityChainTrigger({
  selected,
  editor,
  update,
  openSignal = 0,
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (openSignal > 0) setOpen(true)
  }, [openSignal])

  const attrs = selected?.getAttributes?.() || {}
  let count = 0
  let ruleCount = 0
  try {
    const actions = JSON.parse(attrs['data-actions'] || '[]')
    count = actions.length
    for (const step of actions) {
      if (step.type === 'api') {
        ruleCount += normalizeApiRules(step).length || 1
      }
    }
  } catch {
    count = 0
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-3 rounded-xl border border-indigo-400 bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors text-left shadow-sm"
      >
        <span className="block">Edit Priority Chain…</span>
        <span className="block text-[10px] font-medium text-indigo-100 mt-0.5">
          {count} step{count === 1 ? '' : 's'}
          {ruleCount > 0 ? ` · ${ruleCount} status rule${ruleCount === 1 ? '' : 's'}` : ''}
          {' · '}drag to reorder
        </span>
      </button>
      <PriorityChainModal
        isOpen={open}
        onClose={() => setOpen(false)}
        selected={selected}
        editor={editor}
        update={update}
      />
    </>
  )
}

export default PriorityChainModal
