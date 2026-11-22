import { getStyleProp, setStyleProp } from '../../utils/blockActions'
import { getInputRestriction } from '../../utils/inputRestrictions'
import {
  CORNER_STEPS,
  parseCornerIndex,
  cornerIndexToCss,
  cornerLabel,
} from '../../utils/spacingUtils'
import { StepArrows } from '../../components/SpacingArrows'
import { inputClass, TypographyControls } from './TypographyControls'
import { Field, PositionControls, toHex } from './propertyPanelUtils'
import { CountryPrefixSection } from './inputs/CountryPrefixSection'
import { RestrictionLimitSection } from './inputs/RestrictionLimitSection'
import { AlignmentDirectionSection } from './inputs/AlignmentDirectionSection'

export function InputFieldControls({ selected, editor, update }) {
  const attrs = selected?.getAttributes?.() || {}
  const restriction = getInputRestriction(attrs)
  const placeholder = attrs.placeholder || ''

  const handlePlaceholderChange = (val) => {
    selected.addAttributes({ placeholder: val })
    update()
  }

  const isPhone =
    attrs['data-otp-field'] === 'phone' ||
    attrs['data-dcb-field'] === 'phone' ||
    attrs['data-field'] === 'phone' ||
    attrs.type === 'tel'
  const isOtp =
    attrs['data-otp-field'] === 'otp' ||
    attrs['data-dcb-field'] === 'pin' ||
    attrs['data-field'] === 'otp' ||
    attrs['data-field'] === 'pin'

  return (
    <>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
          {isPhone ? '📱 Phone / Mobile Field' : isOtp ? '🔑 OTP / PIN Field' : '📝 Input Field'}
        </span>
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full uppercase">
          {restriction}
        </span>
      </div>

      <Field label="Placeholder Text">
        <input
          type="text"
          className={inputClass}
          value={placeholder}
          placeholder="e.g. Enter phone number..."
          onChange={(e) => handlePlaceholderChange(e.target.value)}
        />
      </Field>

      {isPhone && <CountryPrefixSection selected={selected} update={update} />}

      <RestrictionLimitSection
        selected={selected}
        update={update}
        restriction={restriction}
      />

      <AlignmentDirectionSection selected={selected} update={update} />

      <TypographyControls selected={selected} update={update} showAlign />

      <Field label="Input Background">
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

      <PositionControls selected={selected} update={update} />
    </>
  )
}

export default InputFieldControls
