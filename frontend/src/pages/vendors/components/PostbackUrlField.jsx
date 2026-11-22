import { useEffect, useState } from 'react'
import Button from '../../../components/ui/Button'

export function PostbackUrlField({ value, onSave, placeholder, saving }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDraft(value || '')
    }, 0)
    return () => clearTimeout(timer)
  }, [value])

  const dirty = (draft || '').trim() !== (value || '').trim()

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!dirty || saving}
        onClick={() => onSave(draft.trim() || null)}
      >
        {saving ? 'Saving…' : 'Save URL'}
      </Button>
    </div>
  )
}
