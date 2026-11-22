import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
} from 'lucide-react'
import { RawHtmlPanel } from './RawHtmlPanel'
import { useEditor } from '../context/EditorContext'
import { ensureLayerManagerMounted, filterBlockElements } from '../plugins/dragAndDrop'
import { insertImageComponent } from '../utils/insertImage'
import { insertBackgroundWithText } from '../utils/insertBackground'
import { unlockInsertion } from '../utils/insertionLock'
import { uploadImage } from '../../services/api/upload'
import { PlacementModal } from '../components/PlacementModal'
import { getFunnelPageGuide } from '../utils/funnelGuide'
import useStore from '../../store/useStore'
import SidebarDock, { TABS } from './sidebar/SidebarDock'
import LayoutsTab from './sidebar/LayoutsTab'
import PhotosTab from './sidebar/PhotosTab'

function findHeadingInSection(section) {
  if (!section) return null
  const tag = section.get('tagName')
  const gjsType = section.get('data-gjs-type')
  if (tag === 'h2' && gjsType === 'text') return section
  for (const child of section.components()) {
    const result = findHeadingInSection(child)
    if (result) return result
  }
  return null
}

function updateBackgroundText(editor, text) {
  if (!editor) return
  const wrapper = editor.getWrapper()
  if (!wrapper) return
  const components = wrapper.components()
  const lastSection = components.at(components.length - 1)
  if (!lastSection) return
  const heading = findHeadingInSection(lastSection)
  if (heading) heading.set('content', text)
}

const SIDEBAR_COLLAPSED_KEY = 'tc-editor-sidebar-collapsed'

export function EditorSidebar() {
  const { editor, funnelPageType, verificationMode, campaignId, step } = useEditor()
  const updateCampaign = useStore((s) => s.updateCampaign)
  const flowGuide = funnelPageType ? getFunnelPageGuide(funnelPageType, verificationMode, step) : undefined
  const hasFlowParts = Boolean(
    flowGuide && ((flowGuide.required?.length || 0) + (flowGuide.optional?.length || 0) > 0)
  )
  const [tab, setTab] = useState(
    hasFlowParts ? 'flow' : 'layouts',
  )
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [search, setSearch] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [assets, setAssets] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [placementModal, setPlacementModal] = useState(null)
  const [brokenAssets, setBrokenAssets] = useState([])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const selectTab = useCallback((id) => {
    if (tab === id && !collapsed) {
      toggleCollapsed()
      return
    }
    setTab(id)
    setCollapsed(false)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '0')
    } catch {
      /* ignore */
    }
  }, [tab, collapsed, toggleCollapsed])

  const refreshAssets = useCallback(() => {
    if (!editor) return
    const all = editor.AssetManager.getAll()
    setAssets(
      all
        .map((asset) => ({ src: asset.get('src') || '' }))
        .filter((asset) => asset.src.trim().length > 0),
    )
  }, [editor])

  const insertAsset = useCallback(
    (src, placement, overlayText) => {
      if (!editor) return
      if (placement === 'background') {
        insertBackgroundWithText(editor, src)
        if (overlayText?.trim()) updateBackgroundText(editor, overlayText.trim())
      } else {
        insertImageComponent(editor, src)
      }
    },
    [editor],
  )

  const openPlacementForAsset = useCallback((src) => {
    if (document.body.classList.contains('tc-is-dragging')) return
    setPlacementModal({ src })
  }, [])

  const deleteAsset = useCallback((src, e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!editor) return
    const all = editor.AssetManager.getAll()
    const asset = all.find((a) => a.get('src') === src)
    if (asset) {
      editor.AssetManager.remove(asset)
    }
    refreshAssets()
  }, [editor, refreshAssets])

  const handlePlacementConfirm = useCallback(
    (placement, overlayText) => {
      if (!editor || !placementModal) return
      unlockInsertion()

      if (placement === 'set-background') {
        const selectedCmp = editor.getSelected() || editor.getWrapper()
        if (selectedCmp) {
          const existingStyle = selectedCmp.getStyle() || {}
          selectedCmp.setStyle({
            ...existingStyle,
            'background-image': `url("${placementModal.src}")`,
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat',
            'position': existingStyle.position || 'relative',
            'overflow': 'visible',
          })
          console.log('[TC] set-background applied inline style to', selectedCmp.get('tagName'))
        }
      } else {
        insertAsset(placementModal.src, placement, overlayText)
        if (placement === 'background' && overlayText?.trim()) updateBackgroundText(editor, overlayText.trim())
      }

      setPlacementModal(null)
      refreshAssets()

      setTimeout(() => {
        if (editor) {
          editor.Canvas.refresh()
          try {
            const body = editor.Canvas.getBody()
            if (body && typeof body.focus === 'function') {
              body.focus()
            }
          } catch (e) {
            console.warn('Failed to focus editor canvas:', e)
          }
        }
      }, 50)
    },
    [editor, placementModal, insertAsset, refreshAssets],
  )

  useEffect(() => {
    if (!editor) return
    if (tab === 'flow') filterBlockElements(editor, 'flow', search)
    if (tab === 'sections') filterBlockElements(editor, 'sections', search)
    if (tab === 'parts') filterBlockElements(editor, 'components', search)
    if (tab === 'structure') ensureLayerManagerMounted(editor)
  }, [editor, tab, search])

  useEffect(() => {
    if (!editor) return
    editor.on('asset:add', refreshAssets)
    editor.on('asset:remove', refreshAssets)
    const timer = setTimeout(() => {
      if (tab === 'photos') refreshAssets()
    }, 0)
    return () => {
      clearTimeout(timer)
      editor.off('asset:add', refreshAssets)
      editor.off('asset:remove', refreshAssets)
    }
  }, [editor, tab, refreshAssets])

  const handleFileUpload = async (e) => {
    if (!editor || !e.target.files?.length) return
    const files = Array.from(e.target.files)
    e.target.value = ''
    setUploading(true)
    setUploadError(null)
    try {
      const uploadPromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) return null
        const result = await uploadImage(file)
        editor.AssetManager.add({ src: result.url, type: 'image', name: file.name })
        return result.url
      })
      const urls = (await Promise.all(uploadPromises)).filter((url) => !!url)
      refreshAssets()
      if (urls.length === 1) {
        setPlacementModal({ src: urls[0] })
      }
      setTab('photos')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const showBlocks = tab === 'flow' || tab === 'sections' || tab === 'parts'
  const activeTab = TABS.find((t) => t.id === tab)
  const filteredAssets = assets.filter((a) =>
    assetSearch ? a.src.toLowerCase().includes(assetSearch.toLowerCase()) : true,
  )

  const selectedKind = (() => {
    if (!editor) return 'none'
    const sel = editor.getSelected()
    if (!sel) return 'none'
    const tag = (sel.get('tagName') || '').toLowerCase()
    const type = sel.get('type') || ''
    const tcType = sel.getAttributes?.()?.['data-tc-type'] || ''
    if (tcType === 'section' || ['section', 'main', 'article', 'header', 'footer', 'div'].includes(tag) || type === 'wrapper') return 'section'
    return 'other'
  })()
  const hasSelectedSection = selectedKind === 'section'

  return (
    <>
      <aside className="tc-sidebar shrink-0 flex min-h-0 relative z-20 select-none">
        <SidebarDock
          tab={tab}
          collapsed={collapsed}
          hasFlowParts={hasFlowParts}
          selectTab={selectTab}
          toggleCollapsed={toggleCollapsed}
        />

        {/* Secondary Sliding Drawer Panel */}
        <div
          className={`flex flex-col min-h-0 min-w-0 bg-white border-r border-slate-200 shadow-xl overflow-hidden transition-[width] duration-300 ease-in-out ${
            collapsed ? 'w-0 border-0 opacity-0' : 'w-72 opacity-100'
          }`}
          aria-hidden={collapsed}
        >
          <div className="px-4 py-3.5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-2 bg-slate-50/50">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">{activeTab?.label}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{activeTab?.hint}</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Close panel"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {showBlocks && (
            <div className="px-3 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search parts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
                />
              </div>
              <p className="text-[10px] font-semibold text-indigo-500 mt-2 flex items-center gap-1">
                <span>Drag onto the page in the center →</span>
              </p>
            </div>
          )}

          <div
            id="tc-blocks-mount"
            className={`tc-blocks-mount flex-1 min-h-0 overflow-y-auto px-3 pb-3 ${showBlocks ? '' : 'hidden'}`}
          />

          <div className={`flex-1 min-h-0 overflow-y-auto ${showBlocks ? 'hidden' : 'flex flex-col'}`}>
            {tab === 'layouts' && (
              <LayoutsTab
                funnelPageType={funnelPageType}
                step={step}
                editor={editor}
                campaignId={campaignId}
                updateCampaign={updateCampaign}
              />
            )}

            {tab === 'photos' && (
              <PhotosTab
                uploading={uploading}
                uploadError={uploadError}
                handleFileUpload={handleFileUpload}
                assetSearch={assetSearch}
                setAssetSearch={setAssetSearch}
                filteredAssets={filteredAssets}
                brokenAssets={brokenAssets}
                setBrokenAssets={setBrokenAssets}
                openPlacementForAsset={openPlacementForAsset}
                deleteAsset={deleteAsset}
                editor={editor}
              />
            )}

            {tab === 'structure' && (
              <div className="flex-1 min-h-0 flex flex-col p-3">
                <p className="text-[11px] text-fg-muted mb-2 shrink-0">
                  Click any item to select it on the page. Useful when something is hard to click.
                </p>
                <div id="tc-layers-panel" className="tc-layers-host flex-1 min-h-0 overflow-y-auto" />
              </div>
            )}

            {tab === 'code' && (
              <div className="flex-1 min-h-0 flex flex-col p-3">
                <RawHtmlPanel editor={editor} active={tab === 'code'} />
              </div>
            )}
          </div>
        </div>
      </aside>

      <div id="tc-traits-hidden" className="hidden" />
      <div id="tc-styles-hidden" className="hidden" />

      <PlacementModal
        isOpen={!!placementModal}
        imageUrl={placementModal?.src ?? null}
        uploading={uploading}
        onClose={() => setPlacementModal(null)}
        onConfirm={handlePlacementConfirm}
        hasSelectedSection={hasSelectedSection}
      />
    </>
  )
}

export default EditorSidebar
