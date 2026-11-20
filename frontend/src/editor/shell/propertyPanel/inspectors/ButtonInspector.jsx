import { memo } from 'react'
import { getStyleProp, setStyleProp } from '../../../utils/blockActions'
import { getLinkText, setLinkText } from '../../../utils/textContent'
import { MIN_BTN_WIDTH } from '../../../utils/textSizeAlign'
import {
  CORNER_STEPS,
  parseCornerIndex,
  cornerIndexToCss,
  cornerLabel,
} from '../../../utils/spacingUtils'
import { StepArrows } from '../../../components/SpacingArrows'
import { inputClass, TypographyControls } from '../TypographyControls'
import { Field, PositionControls, toHex, getButtonSize } from '../propertyPanelUtils'
import { ClickActionEditor, isLockedSystemAction } from '../ClickActionEditor'

export function ButtonInspector({ selected, editor, update }) {
  return (
    <>
      <Field label="Button label">
        <input
          className={inputClass}
          value={getLinkText(selected)}
          onChange={(e) => {
            setLinkText(selected, e.target.value, editor)
            update()
            try {
              editor?.Canvas?.refresh?.()
            } catch (_) {
              /* noop */
            }
          }}
        />
      </Field>
      {!isLockedSystemAction(selected.getAttributes() || {}) && (
        <ClickActionEditor selected={selected} editor={editor} update={update} />
      )}
      <TypographyControls
        selected={selected}
        update={update}
        showAlign
        colorFallback="#ffffff"
      />
      <Field label="Button color">
        <div className="flex gap-2">
          <input
            type="color"
            className="flex-1 h-9 rounded-lg border border-border cursor-pointer"
            value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#2563eb')}
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
      <Field label="Button size">
        <select
          className={inputClass}
          value={getButtonSize(getStyleProp(selected, 'padding'))}
          onChange={(e) => {
            const map = {
              sm: '8px 16px',
              md: '12px 24px',
              lg: '16px 32px',
            }
            setStyleProp(selected, 'padding', map[e.target.value] || map.md)
            update()
          }}
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </Field>
      <div className="flex gap-2">
        <Field label="Width">
          <input
            className={inputClass}
            placeholder="e.g. 100% or 220px"
            value={getStyleProp(selected, 'width') || ''}
            onChange={(e) => {
              const val = e.target.value.trim()
              const next = { ...selected.getStyle() }
              const full = !val || val === '100%' || val === 'auto'
              if (full) {
                next.width = '100%'
                next['min-width'] = '0'
                next['max-width'] = '100%'
                next.display = 'inline-flex'
                next['align-self'] = 'stretch'
              } else {
                next.width = val
                next['max-width'] = '100%'
                // Floor only — matching width would block further canvas shrink.
                next['min-width'] = `${MIN_BTN_WIDTH}px`
                next.display = 'inline-flex'
                next['align-self'] = 'center'
                next['flex-shrink'] = '0'
              }
              selected.setStyle(next)
              update()
              try {
                editor?.Canvas?.refresh?.()
              } catch (_) {
                /* noop */
              }
            }}
          />
        </Field>
        <Field label="Min height">
          <input
            className={inputClass}
            placeholder="e.g. 44px"
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
              try {
                editor?.Canvas?.refresh?.()
              } catch (_) {
                /* noop */
              }
            }}
          />
        </Field>
      </div>
      <p className="text-[11px] text-fg-subtle -mt-2 leading-relaxed">
        Drag corner or left/right handles on the canvas to resize width and height.
      </p>
      <PositionControls selected={selected} update={update} />
    </>
  )
}

export default memo(ButtonInspector)
