import { memo } from 'react'
import { getStyleProp, setStyleProp } from '../../../utils/blockActions'
import { inputClass } from '../TypographyControls'
import { Field, PositionControls } from '../propertyPanelUtils'
import { ClickActionEditor } from '../ClickActionEditor'

export function ImageInspector({ selected, editor, update }) {
  return (
    <>
      <button
        type="button"
        onClick={() => editor.runCommand('tc-image-replace')}
        className="w-full py-2.5 text-sm font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent text-fg transition-colors"
      >
        Change photo
      </button>
      <ClickActionEditor selected={selected} editor={editor} update={update} />
      <button
        type="button"
        onClick={() => {
          if (editor && selected) {
            editor.runCommand('tc-add-hotspot', { target: selected })
          }
        }}
        className="w-full mt-2 py-2.5 text-sm font-semibold rounded-lg border border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
      >
        <span>+</span> Add Clickable Area
      </button>
      <Field label="Description for accessibility">
        <input
          className={inputClass}
          placeholder="Describe this image (optional)"
          value={selected.getAttributes()?.alt || ''}
          onChange={(e) => {
            selected.addAttributes({ alt: e.target.value })
            update()
          }}
        />
      </Field>
      <Field label="Photo size">
        <select
          className={inputClass}
          value={
            getStyleProp(selected, 'width') === '50%' ? 'half'
            : getStyleProp(selected, 'width') === '320px' ? 'small'
            : 'full'
          }
          onChange={(e) => {
            const map = {
              full: { width: '100%', height: 'auto' },
              half: { width: '50%', height: 'auto' },
              small: { width: '320px', height: 'auto' },
            }
            const next = map[e.target.value] || map.full
            setStyleProp(selected, 'width', next.width)
            setStyleProp(selected, 'height', next.height)
            update()
          }}
        >
          <option value="full">Full width</option>
          <option value="half">Half width</option>
          <option value="small">Small</option>
        </select>
      </Field>
      <div className="flex gap-2">
        <Field label="Width">
          <input
            className={inputClass}
            placeholder="e.g. 100px or 50%"
            value={getStyleProp(selected, 'width') || ''}
            onChange={(e) => {
              setStyleProp(selected, 'width', e.target.value)
              update()
            }}
          />
        </Field>
        <Field label="Height">
          <input
            className={inputClass}
            placeholder="e.g. auto"
            value={getStyleProp(selected, 'height') || ''}
            onChange={(e) => {
              setStyleProp(selected, 'height', e.target.value)
              update()
            }}
          />
        </Field>
      </div>
      <PositionControls selected={selected} update={update} />
    </>
  )
}

export default memo(ImageInspector)
