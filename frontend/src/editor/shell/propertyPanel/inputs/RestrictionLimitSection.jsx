import { Field } from '../propertyPanelUtils'
import { inputClass } from '../TypographyControls'

export function RestrictionLimitSection({ selected, update, restriction }) {
  const attrs = selected?.getAttributes?.() || {}
  const minLength = attrs['data-min-length'] ?? attrs.minlength ?? ''
  const maxLength = attrs['data-max-length'] ?? attrs.maxlength ?? ''

  const handleRestrictionChange = (newRestriction) => {
    if (newRestriction === 'any') {
      selected.removeAttributes('data-input-restriction')
    } else {
      selected.addAttributes({ 'data-input-restriction': newRestriction })
    }

    if (newRestriction === 'numbers') {
      selected.addAttributes({ inputmode: 'numeric' })
      if (attrs.type !== 'tel') {
        selected.addAttributes({ type: 'tel' })
      }
    } else if (newRestriction === 'email') {
      selected.addAttributes({ type: 'email' })
      selected.removeAttributes('inputmode')
    } else {
      if (attrs.type === 'tel' || attrs.type === 'number') {
        selected.addAttributes({ type: 'text' })
      }
      selected.removeAttributes('inputmode')
    }
    update()
  }

  const handleMinLengthChange = (val) => {
    const clean = val.replace(/\D/g, '')
    if (clean === '') {
      selected.removeAttributes('data-min-length')
      selected.removeAttributes('minlength')
    } else {
      selected.addAttributes({
        'data-min-length': clean,
        minlength: clean,
      })
    }
    update()
  }

  const handleMaxLengthChange = (val) => {
    const clean = val.replace(/\D/g, '')
    if (clean === '') {
      selected.removeAttributes('data-max-length')
      selected.removeAttributes('maxlength')
    } else {
      selected.addAttributes({
        'data-max-length': clean,
        maxlength: clean,
      })
    }
    update()
  }

  return (
    <>
      <Field label="Input Restriction (Allowed Characters)">
        <select
          className={inputClass}
          value={restriction}
          onChange={(e) => handleRestrictionChange(e.target.value)}
        >
          <option value="numbers">Numbers Only (0–9)</option>
          <option value="text">Text Only (Letters &amp; spaces)</option>
          <option value="alphanumeric">Alphanumeric (Letters &amp; Numbers)</option>
          <option value="email">Email Address</option>
          <option value="any">Any Characters (No Restriction)</option>
        </select>
        <p className="text-[11px] text-fg-muted pt-0.5">
          {restriction === 'numbers' && 'Only numeric digits (0–9) are allowed; blocks letters and symbols.'}
          {restriction === 'text' && 'Only alphabetic letters and spaces are allowed; blocks numbers and symbols.'}
          {restriction === 'alphanumeric' && 'Letters and numbers allowed; blocks special symbols.'}
          {restriction === 'email' && 'Email address format characters.'}
          {restriction === 'any' && 'Free text entry without character restrictions.'}
        </p>
      </Field>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-fg-muted">Character Limits (Min / Max)</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Min Limit</label>
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={minLength}
              placeholder="e.g. 7"
              onChange={(e) => handleMinLengthChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Max Limit</label>
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={maxLength}
              placeholder="e.g. 10"
              onChange={(e) => handleMaxLengthChange(e.target.value)}
            />
          </div>
        </div>
        <p className="text-[11px] text-fg-muted pt-0.5">
          Min limit prevents submitting too few characters; Max limit prevents typing extra characters.
        </p>
      </div>
    </>
  )
}
