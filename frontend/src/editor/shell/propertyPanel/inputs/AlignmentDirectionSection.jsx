import { getStyleProp, setStyleProp } from '../../../utils/blockActions'

export function AlignmentDirectionSection({ selected, update }) {
  const attrs = selected?.getAttributes?.() || {}
  const textAlign = getStyleProp(selected, 'text-align') || ''
  const dir = attrs.dir || getStyleProp(selected, 'direction') || ''

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

  return (
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
  )
}
