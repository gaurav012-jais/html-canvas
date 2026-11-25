import { memo } from 'react'
import { getStyleProp, setStyleProp } from '../../../utils/blockActions'
import { getSectionAnchorId, setSectionAnchorId, ANCHOR_PRESETS } from '../../../utils/sectionAnchor'
import {
  CORNER_STEPS,
  parseCornerIndex,
  cornerIndexToCss,
  cornerLabel,
} from '../../../utils/spacingUtils'
import { StepArrows } from '../../../components/SpacingArrows'
import {
  inputClass,
  FontFamilyField,
  TextColorField,
  TextAlignField,
} from '../TypographyControls'
import { Field, PositionControls, toHex } from '../propertyPanelUtils'
import { ClickActionEditor } from '../ClickActionEditor'
import { BackgroundImageField, AddHotspotButton } from '../BackgroundControls'

export function SectionInspector({
  selected,
  editor,
  update,
  anchorError,
  setAnchorError,
}) {
  return (
    <>
      <ClickActionEditor selected={selected} editor={editor} update={update} />
      <Field label="Section label (for builder dropdown)">
        <input
          className={inputClass}
          placeholder="e.g. Hero Section"
          value={selected.get('sectionLabel') || ''}
          onChange={(e) => {
            selected.set('sectionLabel', e.target.value)
            update()
          }}
        />
      </Field>
      <Field label="Section anchor (for nav links)">
        <input
          className={inputClass}
          placeholder="contact"
          value={getSectionAnchorId(selected)}
          onChange={(e) => {
            if (!editor) return
            const result = setSectionAnchorId(editor, selected, e.target.value)
            setAnchorError(result.ok ? null : result.error ?? null)
            if (result.ok) update()
          }}
        />
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {ANCHOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                if (!editor) return
                const result = setSectionAnchorId(editor, selected, preset)
                setAnchorError(result.ok ? null : result.error ?? null)
                if (result.ok) update()
              }}
              className="px-2 py-0.5 text-[11px] rounded-md border border-border bg-bg-subtle hover:border-accent hover:text-accent capitalize"
            >
              {preset}
            </button>
          ))}
        </div>
        <p className="text-xs text-fg-muted pt-1">
          Navbar link <code className="text-[11px]">#contact</code> scrolls here. Pick a preset or type your own.
        </p>
        {anchorError && <p className="text-xs text-danger pt-0.5">{anchorError}</p>}
      </Field>

      {getStyleProp(selected, 'background-image') && (
        <Field label="Overlay Opacity">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={parseFloat(getStyleProp(selected, '--overlay-opacity') || '0.45')}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                const overlayDivs = selected.components().filter((c) => 
                  c.get('tagName') === 'div' && 
                  c.getAttributes?.()?.['data-overlay'] === 'true'
                )
                if (overlayDivs.length > 0) {
                  overlayDivs[0].setStyle({ opacity: String(val) })
                }
                setStyleProp(selected, '--overlay-opacity', String(val))
                update()
              }}
              className="flex-1 accent-accent h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-fg-muted min-w-[40px] text-center">
              {Math.round(parseFloat(getStyleProp(selected, '--overlay-opacity') || '0.45') * 100)}%
            </span>
          </div>
          <p className="text-[11px] text-fg-subtle mt-1">Adjust overlay darkness for better text readability</p>
        </Field>
      )}

      <BackgroundImageField selected={selected} editor={editor} update={update} />

      <AddHotspotButton selected={selected} editor={editor} />

      <FontFamilyField selected={selected} update={update} />
      <TextColorField selected={selected} update={update} fallback="#000000" />
      <TextAlignField selected={selected} update={update} />

      <Field label="Background Color">
        <div className="flex gap-2">
          <input
            type="color"
            className="flex-1 h-9 rounded-lg border border-border cursor-pointer"
            value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#ffffff')}
            onChange={(e) => {
              setStyleProp(selected, 'background-color', e.target.value)
              update()
            }}
          />
          <button
            type="button"
            onClick={() => {
              setStyleProp(selected, 'background-color', 'transparent')
              update()
            }}
            className="px-3 h-9 text-xs font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent hover:text-accent transition-colors"
            title="Make transparent"
          >
            Clear
          </button>
        </div>
      </Field>
      <StepArrows
        label="Corner roundness"
        valueLabel={cornerLabel(parseCornerIndex(getStyleProp(selected, 'border-radius')))}
        decreaseTitle="Less rounded"
        increaseTitle="More rounded"
        onDecrease={() => {
          const idx = Math.max(0, parseCornerIndex(getStyleProp(selected, 'border-radius')) - 1)
          setStyleProp(selected, 'border-radius', cornerIndexToCss(idx))
          update()
        }}
        onIncrease={() => {
          const idx = Math.min(CORNER_STEPS.length - 1, parseCornerIndex(getStyleProp(selected, 'border-radius')) + 1)
          setStyleProp(selected, 'border-radius', cornerIndexToCss(idx))
          update()
        }}
      />
      <div className="flex gap-2">
        <Field label="Width">
          <input
            className={inputClass}
            placeholder="e.g. 100% or 400px"
            value={getStyleProp(selected, 'width') || ''}
            onChange={(e) => {
              setStyleProp(selected, 'width', e.target.value)
              update()
            }}
          />
        </Field>
        <Field label="Min height">
          <input
            className={inputClass}
            placeholder="e.g. 400px"
            value={getStyleProp(selected, 'min-height') || getStyleProp(selected, 'height') || ''}
            onChange={(e) => {
              const val = e.target.value.trim()
              const next = { ...selected.getStyle() }
              if (val) {
                next['min-height'] = val
                delete next.height
              } else {
                delete next['min-height']
              }
              selected.setStyle(next)
              update()
            }}
          />
        </Field>
      </div>
      <p className="text-[11px] text-slate-400 -mt-1 leading-relaxed">
        Drag the blue corner/edge handles on the canvas, or type a min height here to make the block taller.
      </p>
      <PositionControls selected={selected} update={update} />
      <Field label="Layout">
        <select
          className={inputClass}
          value={getStyleProp(selected, 'display') || 'block'}
          onChange={(e) => {
            setStyleProp(selected, 'display', e.target.value)
            update()
          }}
        >
          <option value="block">Block</option>
          <option value="flex">Flex</option>
          <option value="grid">Grid</option>
        </select>
      </Field>
      {getStyleProp(selected, 'display') === 'flex' && (
        <>
          <Field label="Flex direction">
            <select
              className={inputClass}
              value={getStyleProp(selected, 'flex-direction') || 'row'}
              onChange={(e) => {
                setStyleProp(selected, 'flex-direction', e.target.value)
                update()
              }}
            >
              <option value="row">Row</option>
              <option value="column">Column</option>
            </select>
          </Field>
          <Field label="Gap">
            <input
              className={inputClass}
              placeholder="e.g. 16px, 24px"
              value={getStyleProp(selected, 'gap') || ''}
              onChange={(e) => {
                setStyleProp(selected, 'gap', e.target.value)
                update()
              }}
            />
          </Field>
          <Field label="Align items">
            <select
              className={inputClass}
              value={getStyleProp(selected, 'align-items') || 'stretch'}
              onChange={(e) => {
                setStyleProp(selected, 'align-items', e.target.value)
                update()
              }}
            >
              <option value="stretch">Stretch</option>
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
            </select>
          </Field>
          <Field label="Justify content">
            <select
              className={inputClass}
              value={getStyleProp(selected, 'justify-content') || 'flex-start'}
              onChange={(e) => {
                setStyleProp(selected, 'justify-content', e.target.value)
                update()
              }}
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="space-between">Space between</option>
            </select>
          </Field>
        </>
      )}
    </>
  )
}

export default memo(SectionInspector)
