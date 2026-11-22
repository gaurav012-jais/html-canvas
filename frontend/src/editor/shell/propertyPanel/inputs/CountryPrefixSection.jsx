import { useState, useEffect } from 'react'
import { inputClass } from '../TypographyControls'

const COUNTRY_PRESETS = [
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+962', label: '🇯🇴 +962' },
  { code: '+966', label: '🇸🇦 +966' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+226', label: '🇧🇫 +226' },
  { code: '+249', label: '🇸🇩 +249' },
  { code: '+965', label: '🇰🇼 +965' },
]

const PREFIX_BADGE_SELECTOR =
  '[data-country-code], [data-phone-prefix], .wjo-country-code, .phone-prefix-badge, .country-code-prefix, .bf-country-prefix'

export function CountryPrefixSection({ selected, update }) {
  const attrs = selected?.getAttributes?.() || {}
  const countryCode = attrs['data-country-code'] || attrs['data-phone-prefix'] || ''
  const parent = selected?.parent?.()

  const existingBadge = parent ? parent.find?.(PREFIX_BADGE_SELECTOR)?.[0] : null
  const [showBadge, setShowBadge] = useState(() => Boolean(existingBadge))

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBadge(Boolean(existingBadge))
    }, 0)
    return () => clearTimeout(timer)
  }, [selected, existingBadge])

  const syncBadgeInCanvas = (code) => {
    if (!parent) return
    const badge = parent.find?.(PREFIX_BADGE_SELECTOR)?.[0]
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
    const badges = parent.find?.(PREFIX_BADGE_SELECTOR) || []
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
          {COUNTRY_PRESETS.map((p) => (
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
  )
}
