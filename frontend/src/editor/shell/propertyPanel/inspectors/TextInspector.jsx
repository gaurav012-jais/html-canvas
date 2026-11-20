import { memo } from 'react'
import { getTextContent, setTextContent } from '../../../utils/textContent'
import { inputClass, TypographyControls } from '../TypographyControls'
import { Field, PositionControls } from '../propertyPanelUtils'
import { ClickActionEditor } from '../ClickActionEditor'

export function TextInspector({ selected, editor, update }) {
  return (
    <>
      <Field label="What it says">
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={getTextContent(selected)}
          placeholder="Add your text here..."
          onChange={(e) => {
            setTextContent(selected, e.target.value, editor)
            update()
          }}
        />
        <p className="text-xs text-fg-muted pt-0.5">Tip: double-click text on the page to edit it directly.</p>
      </Field>
      <ClickActionEditor selected={selected} editor={editor} update={update} />
      <TypographyControls selected={selected} update={update} showAlign />
      <PositionControls selected={selected} update={update} />
    </>
  )
}

export default memo(TextInspector)
