import { useState, useEffect } from 'react'
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

export function InputFieldControls({ selected, editor, update }) {
  const attrs = selected?.getAttributes?.() || {}
  const restriction = getInputRestriction(attrs)
  const placeholder = attrs.placeholder || ''
  const minLength = attrs['data-min-length'] ?? attrs.minlength ?? ''
  const maxLength = attrs['data-max-length'] ?? attrs.maxlength ?? ''

  const textAlign = getStyleProp(selected, 'text-align') || ''
  const dir = attrs.dir || getStyleProp(selected, 'direction') || ''

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

  const handlePlaceholderChange = (val) => {
    selected.addAttributes({ placeholder: val })
    update()
  }

  const handleAlignChange = (align) => {
    setStyleProp(selected, 'text-align', align)
    update()
  }

  const handleDirChange = (newDir) => {
    if (!newDir) {
      selected.removeAttributes('dir')
      setStyleProp(selected, 'direction', '')
    } else {
      selected.addAttributes({ dir: newDir })
      setStyleProp(selected, 'direction', newDir)
    }
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

  const countryCode = attrs['data-country-code'] || attrs['data-phone-prefix'] || ''
  const parent = selected?.parent?.()
  const prefixBadgeSelector =
    '[data-country-code], [data-phone-prefix], .wjo-country-code, .phone-prefix-badge, .country-code-prefix, .bf-country-prefix'
  const existingBadge = parent
    ? parent.find?.(prefixBadgeSelector)?.[0]
    : null
  const [showBadge, setShowBadge] = useState(() => Boolean(existingBadge))

  useEffect(() => {
    setShowBadge(Boolean(existingBadge))
  }, [selected, existingBadge])

  const syncBadgeInCanvas = (code) => {
    if (!parent) return
    const badge = parent.find?.(prefixBadgeSelector)?.[0]
    if (badge) {
      badge.set('content', code)
      badge.addAttributes({ 'data-country-code': code })
    } else {
      const idx = selected.index()
      parent.components().add(
        {
          tagName: 'span',
          classes: ['wjo-country-code', 'phone-prefix-badge'],
          attributes: { 'data-country-code': code },
          content: code,
          style: {
            background: '#f0f4ff',
            color: '#4f46e5',
            'font-weight': '700',
            'font-size': '15px',
            padding: '0 12px',
            height: '100%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'border-right': '1.5px solid #dce0ee',
            'user-select': 'none',
            'flex-shrink': '0',
          },
        },
        { at: idx }
      )
    }
  }

  const removeBadgeFromCanvas = () => {
    if (!parent) return
    const badges = parent.find?.(prefixBadgeSelector) || []
    badges.forEach((b) => b.remove())
  }

  const handleCountryCodeChange = (val) => {
    const raw = String(val || '').trim()
    if (!raw) {
      selected.removeAttributes('data-country-code')
      selected.removeAttributes('data-phone-prefix')
      removeBadgeFromCanvas()
    } else {
      selected.addAttributes({ 'data-country-code': raw })
      if (showBadge) {
        syncBadgeInCanvas(raw)
      }
    }
    update()
  }

  const handleBadgeToggle = (enable) => {
    setShowBadge(enable)
    if (!enable) {
      removeBadgeFromCanvas()
    } else if (countryCode) {
      syncBadgeInCanvas(countryCode)
    }
    update()
  }

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

      {isPhone && (
        <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              🌐 Country Code (Prefix)
            </span>
            {countryCode ? (
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full font-mono">
                {countryCode}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                None
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">
              Dial Code (e.g. 91 or +91)
            </label>
            <input
              type="text"
              className={inputClass}
              value={countryCode}
              placeholder="e.g. 91 or +91"
              onChange={(e) => handleCountryCodeChange(e.target.value)}
            />
            <p className="text-[11px] text-fg-muted pt-1">
              Prepends to mobile number when sending OTP (e.g. 791234567 → {countryCode || '91'}791234567).
            </p>
          </div>

          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Quick Presets</label>
            <div className="flex flex-wrap gap-1">
              {[
                { code: '+91', label: '🇮🇳 +91' },
                { code: '+962', label: '🇯🇴 +962' },
                { code: '+966', label: '🇸🇦 +966' },
                { code: '+971', label: '🇦🇪 +971' },
                { code: '+226', label: '🇧🇫 +226' },
                { code: '+249', label: '🇸🇩 +249' },
                { code: '+965', label: '🇰🇼 +965' },
              ].map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleCountryCodeChange(p.code)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors border ${
                    countryCode === p.code
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-fg-muted hover:text-fg hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {countryCode && (
                <button
                  type="button"
                  onClick={() => handleCountryCodeChange('')}
                  className="text-[11px] px-2 py-0.5 rounded-md font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1.5 cursor-pointer select-none border-t border-indigo-100/60 mt-1">
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => handleBadgeToggle(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="text-[11.5px] font-medium text-gray-700">
              Show visual badge on card ({countryCode || '+91'} | )
            </span>
          </label>
        </div>
      )}

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

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-fg-muted">Alignment &amp; Direction</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Text Align</label>
            <div className="flex rounded-lg border border-border overflow-hidden bg-bg-subtle p-0.5">
              {['left', 'center', 'right'].map((al) => (
                <button
                  key={al}
                  type="button"
                  onClick={() => handleAlignChange(al)}
                  className={`flex-1 py-1 text-xs font-semibold capitalize rounded-md transition-colors ${
                    textAlign === al
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {al}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Direction</label>
            <div className="flex rounded-lg border border-border overflow-hidden bg-bg-subtle p-0.5">
              {[
                { val: 'ltr', label: 'LTR' },
                { val: 'rtl', label: 'RTL' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDirChange(val)}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                    dir === val
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
