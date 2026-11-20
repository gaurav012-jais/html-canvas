import { memo } from 'react'
import { Plus } from 'lucide-react'
import { inputClass } from './TypographyControls'

export function extractUrlFromBgImage(bgImage) {
  if (!bgImage) return ''
  const m = bgImage.match(/url\(["']?([^"')]+)["']?\)/)
  return m ? m[1] : ''
}

export function BackgroundImageField({
  selected,
  update,
  label = 'Background photo',
  hint,
  showHotspotHelper = true,
  editor,
}) {
  const style = selected?.getStyle?.() || {}
  const bgImage = style['background-image'] || ''
  const currentUrl = extractUrlFromBgImage(bgImage)
  const bgSize = style['background-size'] || 'cover'
  const bgPosition = style['background-position'] || 'center'
  const bgRepeat = style['background-repeat'] || 'no-repeat'

  const handleUrlChange = (url) => {
    const trimmed = url.trim()
    if (!trimmed) {
      selected.addStyle({
        'background-image': '',
        'background-size': '',
        'background-position': '',
        'background-repeat': '',
      })
    } else {
      selected.addStyle({
        'background-image': `url("${trimmed}")`,
        'background-size': bgSize || 'cover',
        'background-position': bgPosition || 'center',
        'background-repeat': bgRepeat || 'no-repeat',
      })
    }
    update()
  }

  const handleRemove = () => {
    selected.addStyle({
      'background-image': '',
      'background-size': '',
      'background-position': '',
      'background-repeat': '',
    })
    update()
  }

  const handleAddHotspot = () => {
    if (!editor) return
    editor.runCommand('tc-add-hotspot', { target: selected })
  }

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">{label}</span>
        {currentUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            Remove photo
          </button>
        )}
      </div>

      {hint && <p className="text-[11px] text-slate-500 leading-snug">{hint}</p>}

      {currentUrl ? (
        <div className="space-y-2">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
            <img
              src={currentUrl}
              alt="Background preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <button
                type="button"
                onClick={handleRemove}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">Photo URL</span>
            <input
              type="text"
              value={currentUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Fit</span>
              <select
                className={inputClass}
                value={bgSize}
                onChange={(e) => {
                  selected.addStyle({ 'background-size': e.target.value })
                  update()
                }}
              >
                <option value="cover">Fill (cover)</option>
                <option value="contain">Fit inside (contain)</option>
                <option value="auto">Original size</option>
                <option value="100% 100%">Stretch to fit</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">Position</span>
              <select
                className={inputClass}
                value={bgPosition}
                onChange={(e) => {
                  selected.addStyle({ 'background-position': e.target.value })
                  update()
                }}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Tile photo</span>
            <button
              type="button"
              onClick={() => {
                const next = bgRepeat === 'repeat' ? 'no-repeat' : 'repeat'
                selected.addStyle({ 'background-repeat': next })
                update()
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                bgRepeat === 'repeat'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {bgRepeat === 'repeat' ? 'Yes (tile)' : 'No (once)'}
            </button>
          </div>

          {showHotspotHelper && editor && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddHotspot}
                className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add clickable hotspot on photo
              </button>
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Adds a transparent subscribe button you can drag over any part of the photo
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value=""
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Paste photo URL (or drag from Uploads)"
            className={inputClass}
          />
          <p className="text-[10px] text-slate-400">
            Tip: Go to <strong>Uploads</strong> tab on the left to drag a photo directly onto this section.
          </p>
        </div>
      )}
    </div>
  )
}

export function AddHotspotButton({ selected, editor }) {
  if (!editor || !selected) return null

  const handleAdd = () => {
    editor.runCommand('tc-add-hotspot', { target: selected })
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
    >
      <Plus className="w-3.5 h-3.5" />
      Add clickable hotspot
    </button>
  )
}

export default memo(BackgroundImageField)
