import { memo } from 'react'
import { Upload, ImageIcon } from 'lucide-react'
import { startAssetDrag } from '../../plugins/assetDrag'

export function PhotosTab({
  uploading,
  uploadError,
  handleFileUpload,
  assetSearch,
  setAssetSearch,
  filteredAssets,
  brokenAssets,
  setBrokenAssets,
  openPlacementForAsset,
  deleteAsset,
  editor,
}) {
  return (
    <div className="p-3 space-y-3 flex-1 min-h-0 overflow-y-auto">
      <label className="flex items-center justify-center gap-2 w-full py-3 px-3 rounded-lg border border-dashed border-border bg-bg-subtle text-sm font-medium text-fg-muted hover:border-accent hover:text-accent cursor-pointer transition-colors">
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Upload a photo'}
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
      </label>

      {uploadError && (
        <p className="text-xs text-danger bg-danger-muted rounded-md px-3 py-2">{uploadError}</p>
      )}

      <p className="text-[11px] text-fg-muted">Click a photo to choose how it appears on your page.</p>

      <input
        type="search"
        placeholder="Search photos..."
        value={assetSearch}
        onChange={(e) => setAssetSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-subtle"
      />

      <div className="grid grid-cols-2 gap-2">
        {filteredAssets.map((a) => {
          const isBroken = brokenAssets.includes(a.src)
          return (
            <div
              key={a.src}
              className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-accent hover:ring-2 hover:ring-accent/20 group flex flex-col items-center justify-center text-center bg-bg-subtle"
            >
              {isBroken ? (
                <div className="flex flex-col items-center justify-center p-2 text-fg-muted select-none">
                  <ImageIcon className="w-8 h-8 mb-1 text-slate-400 opacity-40" />
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-slate-400">Missing</span>
                </div>
              ) : (
                <button
                  type="button"
                  title="Click to add to page"
                  className="w-full h-full cursor-pointer block"
                  onMouseDown={(e) => {
                    if (editor) {
                      startAssetDrag(editor, a.src, e.nativeEvent)
                    }
                  }}
                  onClick={() => openPlacementForAsset(a.src)}
                >
                  <img
                    src={a.src}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                    onError={() => {
                      setBrokenAssets((prev) => [...prev, a.src])
                    }}
                  />
                </button>
              )}
              <button
                type="button"
                title="Delete this image"
                onClick={(e) => deleteAsset(a.src, e)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {filteredAssets.length === 0 && (
        <p className="text-xs text-fg-muted text-center py-8">No photos yet. Upload one to get started.</p>
      )}
    </div>
  )
}

export default memo(PhotosTab)
