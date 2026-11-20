import { memo } from 'react'
import { getStyleProp, setStyleProp } from '../../../utils/blockActions'
import { coverHotspotFullImage } from '../../../utils/overlayStacking'
import { inputClass } from '../TypographyControls'
import { Field } from '../propertyPanelUtils'
import { ClickActionEditor } from '../ClickActionEditor'

export function HotspotInspector({ selected, editor, update }) {
  return (
    <>
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/20 p-3 space-y-1">
        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
          Clickable Area
        </p>
        <p className="text-[11px] text-indigo-600/80 leading-relaxed">
          Draw a box on the image that people can tap or click. In the editor you will see a purple dashed border — on the live page it stays invisible.
        </p>
      </div>
      
      <ClickActionEditor selected={selected} editor={editor} update={update} />
      
      {(selected.getAttributes()?.['data-action'] !== 'SUBSCRIBE') && (
      <Field label="Open in">
        <select
          className={inputClass}
          value={selected.getAttributes()?.target || '_self'}
          onChange={(e) => {
            selected.addAttributes({ target: e.target.value })
            update()
          }}
        >
          <option value="_self">Same Window (Default)</option>
          <option value="_blank">New Window</option>
        </select>
      </Field>
      )}

      <Field label="Name (optional)">
        <input
          className={inputClass}
          placeholder="e.g. Subscribe button"
          value={selected.getAttributes()?.title || ''}
          onChange={(e) => {
            selected.addAttributes({ title: e.target.value })
            update()
          }}
        />
        <p className="text-[10px] text-fg-muted mt-1">Helps you recognise this area later in the layers list</p>
      </Field>

      <div className="pt-2 border-t border-border space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-fg">Size & Position</h3>
          <button
            title="Make the whole image clickable"
            onClick={() => {
              coverHotspotFullImage(selected)
              update()
              const refresh = () => {
                try {
                  editor?.Canvas?.refresh?.()
                } catch (_) {
                  /* noop */
                }
              }
              refresh()
              requestAnimationFrame(refresh)
            }}
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            ⛶ Cover Full Image
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium text-fg-muted uppercase">Width</span>
            <input
              type="text"
              className={inputClass}
              value={getStyleProp(selected, 'width') || '100px'}
              onChange={(e) => {
                setStyleProp(selected, 'width', e.target.value)
                update()
              }}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium text-fg-muted uppercase">Height</span>
            <input
              type="text"
              className={inputClass}
              value={getStyleProp(selected, 'height') || '100px'}
              onChange={(e) => {
                setStyleProp(selected, 'height', e.target.value)
                update()
              }}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium text-fg-muted uppercase">Left Position</span>
            <input
              type="text"
              className={inputClass}
              value={getStyleProp(selected, 'left') || '0px'}
              onChange={(e) => {
                setStyleProp(selected, 'left', e.target.value)
                update()
              }}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium text-fg-muted uppercase">Top Position</span>
            <input
              type="text"
              className={inputClass}
              value={getStyleProp(selected, 'top') || '0px'}
              onChange={(e) => {
                setStyleProp(selected, 'top', e.target.value)
                update()
              }}
            />
          </label>
        </div>
        <p className="text-[10px] text-fg-muted mt-2">
          Tip: <strong>⛶ Cover Full Image</strong> stretches this box over the whole picture. It stays glued when the screen size changes. Drag the blue handles if you only want part of the image clickable.
        </p>
      </div>
    </>
  )
}

export default memo(HotspotInspector)
