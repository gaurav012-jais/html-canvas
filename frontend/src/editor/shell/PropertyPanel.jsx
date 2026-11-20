import { useState, useRef, useLayoutEffect } from 'react'
import {
  Pencil,
  PanelRightOpen,
  PanelRightClose,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getComponentKind } from '../utils/blockActions'
import {
  ensureComponentStylable,
  mountAdvancedPanels,
} from '../utils/mountAdvancedPanels'
import { getFlowElementInfo } from '../utils/funnelGuide'
import { useEditor } from '../context/EditorContext'
import { usePropsCollapsed, usePropsWidth } from './propertyPanel/panelState'
import { KIND_LABELS, toHex } from './propertyPanel/propertyPanelUtils'
import ComponentCodeEditor from './propertyPanel/ComponentCodeEditor'
import InputFieldControls from './propertyPanel/InputFieldControls'
import ButtonInspector from './propertyPanel/inspectors/ButtonInspector'
import TextInspector from './propertyPanel/inspectors/TextInspector'
import ImageInspector from './propertyPanel/inspectors/ImageInspector'
import HotspotInspector from './propertyPanel/inspectors/HotspotInspector'
import SectionInspector from './propertyPanel/inspectors/SectionInspector'

export {
  KIND_LABELS,
  toHex,
  Field,
  PositionControls,
} from './propertyPanel/propertyPanelUtils'
export {
  ClickActionEditor,
  isLockedSystemAction,
  getClickActionType,
  CampaignPageSelect,
  SectionAnchorSelect,
} from './propertyPanel/ClickActionEditor'
export { InputFieldControls } from './propertyPanel/InputFieldControls'
export { ComponentCodeEditor } from './propertyPanel/ComponentCodeEditor'
export { TypographyControls } from './propertyPanel/TypographyControls'
export { BackgroundImageField, AddHotspotButton } from './propertyPanel/BackgroundControls'

export function PropertyPanel() {
  const { editor, selectionVersion, advancedMode, setAdvancedMode, refreshSelection } = useEditor()
  const styleHostRef = useRef(null)
  const traitHostRef = useRef(null)
  const [anchorError, setAnchorError] = useState(null)
  const { collapsed, toggleCollapsed } = usePropsCollapsed()
  const { width: propsWidth, startResize } = usePropsWidth(advancedMode)

  const selected = editor?.getSelected()
  const kind = editor && selected ? getComponentKind(selected) : 'none'
  const flowInfo = selected ? getFlowElementInfo(selected.getAttributes?.() || {}) : null

  const panelStyle = { width: propsWidth }

  const resizeHandle = (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize properties panel"
      title="Drag to resize"
      onMouseDown={startResize}
      className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-ew-resize z-20 group hover:bg-accent/30 active:bg-accent/50"
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-border group-hover:bg-accent opacity-70" />
    </div>
  )

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchorError(null)
  }, [selectionVersion])

  useLayoutEffect(() => {
    if (!editor || !advancedMode || collapsed) return
    const cmp = editor.getSelected()
    if (!cmp || getComponentKind(cmp) === 'none') return

    ensureComponentStylable(cmp)

    if (styleHostRef.current) styleHostRef.current.id = 'tc-advanced-styles'
    if (traitHostRef.current) traitHostRef.current.id = 'tc-advanced-traits'

    mountAdvancedPanels(editor, cmp)
  }, [editor, advancedMode, selectionVersion, collapsed])

  if (collapsed) {
    const label = !editor
      ? 'Properties'
      : selected && kind !== 'none'
      ? KIND_LABELS[kind] || 'Element'
      : 'Properties'
    return (
      <aside className="tc-properties w-12 shrink-0 border-l border-slate-800 bg-[#0e131f] flex flex-col items-center py-4 gap-3 z-20 shadow-lg select-none">
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show properties"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show properties"
          className="flex-1 w-full flex items-start justify-center pt-2"
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {label}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show properties"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </aside>
    )
  }

  if (!editor) {
    return (
      <aside
        className="tc-properties shrink-0 border-l border-slate-200 bg-white p-4 relative shadow-xl z-20 select-none"
        style={panelStyle}
      >
        {resizeHandle}
        <p className="text-xs font-semibold text-slate-400">Loading inspector...</p>
      </aside>
    )
  }

  const update = () => {
    refreshSelection()
  }

  if (!selected || kind === 'none') {
    return (
      <aside
        className="tc-properties shrink-0 border-l border-slate-200 bg-white flex flex-col relative shadow-xl z-20 select-none"
        style={panelStyle}
      >
        {resizeHandle}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Inspector</h2>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Hide properties"
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Pencil className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">No element selected</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            Click any section, text, or button on the artboard to inspect and tweak styling.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="tc-properties shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden relative"
      style={panelStyle}
    >
      {resizeHandle}
      <div className="p-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg truncate">{KIND_LABELS[kind] || 'Element'}</h2>
          <p className="text-xs text-fg-muted mt-0.5 leading-snug">Change how this looks</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            title="Duplicate"
            onClick={() => editor.runCommand('tc-duplicate')}
            className="px-2 py-1 rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg text-[11px] font-medium"
          >
            Duplicate
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => editor.runCommand('tc-delete')}
            className="px-2 py-1 rounded-md text-danger hover:bg-danger-muted text-[11px] font-medium"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Hide properties"
            className="p-1.5 rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {flowInfo && (
          <div className="rounded-lg border border-warning/40 bg-warning-muted/40 p-3 space-y-1">
            <p className="text-xs font-semibold text-fg flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-warning" />
              {flowInfo.label}
            </p>
            <p className="text-[11px] text-fg-muted leading-relaxed">{flowInfo.description}</p>
          </div>
        )}

        {kind === 'input' && (
          <InputFieldControls selected={selected} editor={editor} update={update} />
        )}

        {kind === 'text' && (
          <TextInspector selected={selected} editor={editor} update={update} />
        )}

        {kind === 'button' && (
          <ButtonInspector selected={selected} editor={editor} update={update} />
        )}

        {kind === 'image' && (
          <ImageInspector selected={selected} editor={editor} update={update} />
        )}

        {kind === 'hotspot' && (
          <HotspotInspector selected={selected} editor={editor} update={update} />
        )}

        {(kind === 'section' || kind === 'generic') && (
          <SectionInspector
            selected={selected}
            editor={editor}
            update={update}
            anchorError={anchorError}
            setAnchorError={setAnchorError}
          />
        )}

        <div className="pt-2 border-t border-border">
          <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
              className="rounded border-border"
            />
            Advanced styling options
          </label>
          <p className="text-[11px] text-fg-subtle mt-1.5 leading-relaxed">
            Font, size, color, and spacing are above. Use Advanced for layout, borders, and fine-tuning.
          </p>
        </div>

        {advancedMode && (
          <div className="space-y-4 pt-2">
            <p className="text-[11px] text-fg-muted leading-snug">
              Drag the left edge of this panel wider if CSS controls feel cramped.
            </p>
            <div>
              <h3 className="text-xs font-semibold text-fg mb-2">Component settings</h3>
              <div ref={traitHostRef} className="tc-advanced-traits-host" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-fg mb-2">CSS styles</h3>
              <div ref={styleHostRef} className="tc-advanced-styles-host" />
            </div>
            <ComponentCodeEditor selected={selected} editor={editor} update={update} />
          </div>
        )}
      </div>
    </aside>
  )
}

export function PropertyPanelConnected() {
  return <PropertyPanel />
}

export default PropertyPanel
