import { useState, useMemo, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

export function JsonBlock({ value, label, fallbackText }) {
  const [copied, setCopied] = useState(false)

  const text = useMemo(() => {
    if (value == null || value === '') return null
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }
    return JSON.stringify(value, null, 2)
  }, [value])

  const handleCopy = useCallback(() => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  if (!text) {
    if (!fallbackText) return null
    return (
      <div className="mt-2">
        {label && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            {label}
          </p>
        )}
        <p className="text-xs text-gray-400 italic bg-gray-50 border border-gray-100 rounded-lg p-2.5">
          {fallbackText}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 relative group">
      <div className="flex items-center justify-between mb-1">
        {label && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {label}
          </p>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-[11px] font-mono leading-relaxed bg-gray-950 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-80 whitespace-pre-wrap break-all shadow-inner border border-gray-800">
        {text}
      </pre>
    </div>
  )
}

export default JsonBlock
