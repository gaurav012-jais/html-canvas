import { useState, useEffect } from 'react'
import { Code2, Check, Copy } from 'lucide-react'

export function formatHtml(html) {
  let tab = ''
  let result = ''
  html.split(/>\s*</).forEach((element) => {
    if (element.match(/^\/\w/)) tab = tab.substring(2)
    result += tab + '<' + element + '>\r\n'
    if (element.match(/^<?\w[^>]*[^/]$/) && !element.startsWith('input') && !element.startsWith('img') && !element.startsWith('br') && !element.startsWith('hr')) tab += '  '
  })
  return result.substring(1, result.length - 3)
}

export function ComponentCodeEditor({ selected, editor, update }) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!selected) return
    const raw = selected.toHTML()
    const timer = setTimeout(() => {
      try {
        setCode(formatHtml(raw))
      } catch {
        setCode(raw)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [selected])

  const handleApply = () => {
    if (!selected || !editor) return
    try {
      const replaced = selected.replaceWith(code)
      const nextSelected = Array.isArray(replaced) ? replaced[0] : replaced
      if (nextSelected) {
        editor.select(nextSelected)
      }
      setApplied(true)
      setTimeout(() => setApplied(false), 2000)
      update()
    } catch (err) {
      console.error('Failed to replace component HTML:', err)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-indigo-600" />
          Component HTML
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-44 p-2 text-[11px] font-mono bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y leading-relaxed"
        spellCheck="false"
      />
      <button
        type="button"
        onClick={handleApply}
        className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1"
      >
        {applied ? <Check className="w-3.5 h-3.5" /> : null}
        {applied ? 'Applied to canvas' : 'Apply changes'}
      </button>
    </div>
  )
}

export default ComponentCodeEditor
