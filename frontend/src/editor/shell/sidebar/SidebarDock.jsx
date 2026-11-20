import { memo } from 'react'
import {
  LayoutTemplate,
  Boxes,
  Layers,
  ImageIcon,
  Puzzle,
  ShieldCheck,
  Code2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

export const TABS = [
  { id: 'layouts', label: 'Design', hint: 'Start with a full page design template', icon: LayoutTemplate },
  { id: 'flow', label: 'Funnel Logic', hint: 'Re-add required OTP & subscription buttons', icon: ShieldCheck },
  { id: 'sections', label: 'Elements', hint: 'Drag big layout blocks and cards', icon: Layers },
  { id: 'parts', label: 'Text & Buttons', hint: 'Buttons, headings, images & inputs', icon: Puzzle },
  { id: 'photos', label: 'Uploads', hint: 'Upload and manage custom photos', icon: ImageIcon },
  { id: 'structure', label: 'Layers', hint: 'DOM structure and element tree', icon: Boxes },
  { id: 'code', label: 'Code', hint: 'Edit raw HTML and CSS of the page', icon: Code2 },
]

export function SidebarDock({
  tab,
  collapsed,
  hasFlowParts,
  selectTab,
  toggleCollapsed,
}) {
  return (
    <nav className="w-16 shrink-0 flex flex-col items-center py-3 gap-2 bg-white text-slate-500 border-r border-slate-200 shadow-sm z-10">
      {TABS.filter(
        (t) => !(t.id === 'flow' && !hasFlowParts),
      ).map(({ id, label, icon: Icon }) => {
        const isActive = tab === id && !collapsed
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            title={label}
            aria-pressed={isActive}
            className={`w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 group ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
            <span className="text-[9px] font-semibold tracking-tight uppercase leading-none">{label.split(' ')[0]}</span>
          </button>
        )
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand Drawer' : 'Collapse Drawer'}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>
    </nav>
  )
}

export default memo(SidebarDock)
