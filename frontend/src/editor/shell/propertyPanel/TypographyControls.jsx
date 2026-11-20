import { memo } from 'react'

export const inputClass =
  'w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200'

export const FONT_OPTIONS = [
  { label: 'Default (Canvas)', value: '' },
  { label: 'Inter (Clean / Modern)', value: 'Inter, sans-serif' },
  { label: 'Outfit (Bold / Geometric)', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Serif (Classic)', value: 'Georgia, serif' },
  { label: 'Monospace (Code)', value: 'ui-monospace, monospace' },
]

export const TEXT_SIZE_LABELS = ['Small', 'Normal', 'Medium', 'Large', 'XL', '2XL', '3XL', '4XL', 'Huge']

export function fontFamilyKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/["'\s]/g, '')
}

export function matchFontOptionValue(cssValue) {
  if (!cssValue) return ''
  const k = fontFamilyKey(cssValue)
  const found = FONT_OPTIONS.find((opt) => opt.value && fontFamilyKey(opt.value) === k)
  return found ? found.value : '__custom__'
}

export function FontFamilyField({ selected, update }) {
  const current = selected?.getStyle?.()['font-family'] || ''
  const selectValue = matchFontOptionValue(current)

  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-slate-600">Font</span>
      <select
        className={inputClass}
        value={selectValue === '__custom__' ? '__custom__' : selectValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === '__custom__') return
          selected.addStyle({ 'font-family': v || '' })
          update()
        }}
      >
        {FONT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {selectValue === '__custom__' && (
          <option value="__custom__">Custom ({current.slice(0, 24)}…)</option>
        )}
      </select>
    </div>
  )
}

export function TextSizeField({ selected, update }) {
  const current = selected?.getStyle?.()['font-size'] || '16px'
  const numeric = Number.parseInt(current, 10) || 16
  const sizes = [12, 14, 16, 20, 24, 30, 36, 48, 64]
  let idx = sizes.findIndex((s) => s >= numeric)
  if (idx < 0) idx = sizes.length - 1

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-600">Size</span>
        <span className="font-semibold text-indigo-600">{current}</span>
      </div>
      <input
        type="range"
        min={0}
        max={sizes.length - 1}
        value={idx}
        onChange={(e) => {
          const sz = sizes[Number.parseInt(e.target.value, 10)]
          selected.addStyle({ 'font-size': `${sz}px` })
          update()
        }}
        className="w-full accent-indigo-600"
      />
    </div>
  )
}

export function FontWeightField({ selected, update }) {
  const current = selected?.getStyle?.()['font-weight'] || '400'
  const isBold = current === '700' || current === 'bold' || Number.parseInt(current, 10) >= 600

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-slate-600">Bold</span>
      <button
        type="button"
        onClick={() => {
          selected.addStyle({ 'font-weight': isBold ? '400' : '700' })
          update()
        }}
        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
          isBold
            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
            : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        B
      </button>
    </div>
  )
}

export function TextColorField({ selected, update, label = 'Text color', fallback = '#334155' }) {
  const current = selected?.getStyle?.().color || fallback
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={current.startsWith('#') && current.length === 7 ? current : '#334155'}
          onChange={(e) => {
            selected.addStyle({ color: e.target.value })
            update()
          }}
          className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={current}
          onChange={(e) => {
            selected.addStyle({ color: e.target.value })
            update()
          }}
          className="w-20 px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono text-slate-700"
        />
      </div>
    </div>
  )
}

export function TextAlignField({ selected, update }) {
  const current = selected?.getStyle?.()['text-align'] || 'left'
  const options = ['left', 'center', 'right']

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-slate-600">Align</span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/50 p-0.5">
        {options.map((align) => (
          <button
            key={align}
            type="button"
            onClick={() => {
              selected.addStyle({ 'text-align': align })
              update()
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition-colors ${
              current === align ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            {align}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TypographyControls({
  selected,
  update,
  label = 'Typography',
  showAlign = true,
  textColorLabel = 'Text color',
}) {
  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">{label}</p>
      <FontFamilyField selected={selected} update={update} />
      <TextSizeField selected={selected} update={update} />
      <FontWeightField selected={selected} update={update} />
      <TextColorField selected={selected} update={update} label={textColorLabel} />
      {showAlign && <TextAlignField selected={selected} update={update} />}
    </div>
  )
}

export default memo(TypographyControls)
