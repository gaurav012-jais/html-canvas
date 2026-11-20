# Frontend Template Editor Refactor Plan
> Part of [00-OVERVIEW.md](./00-OVERVIEW.md)

---

## Editor Kya Hai?

GrapesJS-based drag-and-drop template editor. Campaigns ke liye HTML pages banata hai (HOME, OTP, CONFIRM, THANKYOU pages).

---

## Current State

```
editor/
├── TemplateEditor.jsx         ← 973 lines — MASSIVE God Component
├── editor.css
├── grapesConfig.js            ← GrapesJS initialization (complex)
├── styleManagerConfig.js
│
├── blocks/                    ← Drag-drop blocks
│   ├── index.js
│   ├── registry.js
│   ├── components.js
│   ├── sections.js
│   ├── funnelBlocks.js
│   └── thumbnails.js
│
├── components/                ← UI overlays on canvas
│   ├── PlacementModal.jsx
│   └── SpacingArrows.jsx
│
├── context/
│   └── EditorContext.jsx
│
├── plugins/                   ← GrapesJS custom plugins
│   ├── assetDrag.js
│   ├── assetUpload.js
│   ├── canvasEnhancements.js
│   ├── dragAndDrop.js
│   ├── dragPreview.js
│   ├── dragUnstick.js
│   ├── editorExperience.js
│   ├── pagesManager.js
│   └── textEditing.js
│
├── services/                  ← Editor-specific business logic
│   ├── deviceLayouts.js
│   ├── exportSite.js
│   ├── flowRuntimeCss.js
│   ├── loadTemplate.js
│   ├── saveCampaignPage.js
│   ├── saveTemplate.js
│   └── wysiwygContract.js
│
├── shell/                     ← Editor UI shell components
│   ├── BlockCard.jsx
│   ├── ContextualFormatBar.jsx
│   ├── DragDebugOverlay.jsx (probably debug file — delete?)
│   ├── EditorShell.jsx
│   ├── EditorToolbar.jsx
│   ├── LayerPanel.jsx
│   ├── PageTabs.jsx
│   ├── PropertyPanel.jsx
│   └── SidebarPanel.jsx
│
└── utils/                     ← Pure helper functions
    ├── blockStyles.js
    ├── cssVars.js
    ├── fontsManager.js
    ├── overlayStacking.js
    ├── sectionAnchor.js
    ├── spacingUtils.js
    ├── styleUtils.js
    ├── subscribeRoutes.js
    ├── subscribeUrlPreview.js
    ├── textContent.js
    └── textSizeAlign.js
```

**Editor structure actually theek hai** — `shell/`, `plugins/`, `services/`, `utils/` correctly separated hain.

**Ek hi bada problem hai: `TemplateEditor.jsx` (973 lines)**

---

## `TemplateEditor.jsx` — Kya Kya Karta Hai Yeh File?

Line-by-line analysis:

| Lines | Kya Karta Hai |
|---|---|
| 1–50 | Imports (30+ imports) |
| 50–150 | GrapesJS init + plugin registration |
| 150–300 | Save logic (campaign page save + template save) |
| 300–450 | Load logic (template load + page switching) |
| 450–600 | Device layout switching (mobile/tablet/desktop) |
| 600–750 | Block panel + search |
| 750–900 | Property panel (selected element) |
| 900–973 | Render (JSX) |

**Yeh ek component nahi hai — yeh ek mini-application hai.**

---

## New `TemplateEditor.jsx` Architecture

### Core Principle
`TemplateEditor.jsx` sirf ek orchestrator hoga. Har "feature" apna hook/component hoga.

### New File Structure
```
editor/
├── TemplateEditor.jsx         ← MAX 150 lines (compose only)
├── editor.css
├── grapesConfig.js            ← Unchanged
├── styleManagerConfig.js      ← Unchanged
│
├── hooks/                     ← NEW FOLDER
│   ├── useEditorInit.js       ← GrapesJS init + plugins
│   ├── useEditorSave.js       ← Save campaign page + template
│   ├── useEditorLoad.js       ← Load template + page switch
│   ├── useDeviceLayout.js     ← Mobile/tablet/desktop switch
│   └── useBlockSearch.js      ← Block panel search/filter
│
├── blocks/                    ← Unchanged
├── components/                ← Unchanged
├── context/                   ← Unchanged
├── plugins/                   ← Unchanged
├── services/                  ← Unchanged
├── shell/                     ← Unchanged (DragDebugOverlay delete karo)
└── utils/                     ← Unchanged
```

### New `TemplateEditor.jsx`

```jsx
/**
 * TemplateCraft visual editor — GrapesJS wrapper.
 * Orchestrates: init → load → edit → save lifecycle.
 *
 * Layers:
 *  - useEditorInit    → GrapesJS instance + plugins
 *  - useEditorLoad    → Template/page loading
 *  - useEditorSave    → Persist to backend
 *  - useDeviceLayout  → Preview device switching
 */
import { useRef } from 'react'
import EditorShell from './shell/EditorShell'
import { EditorProvider } from './context/EditorContext'
import { useEditorInit } from './hooks/useEditorInit'
import { useEditorLoad } from './hooks/useEditorLoad'
import { useEditorSave } from './hooks/useEditorSave'
import { useDeviceLayout } from './hooks/useDeviceLayout'

export default function TemplateEditor({ campaignId, pageType, templateId }) {
  const containerRef = useRef(null)

  const { editor } = useEditorInit({ containerRef })
  const { currentPage, switchPage } = useEditorLoad({ editor, campaignId, pageType })
  const { save, saving } = useEditorSave({ editor, campaignId, currentPage })
  const { device, setDevice } = useDeviceLayout({ editor })

  return (
    <EditorProvider value={{ editor, save, saving, device, setDevice, switchPage }}>
      <EditorShell containerRef={containerRef} />
    </EditorProvider>
  )
}
```

---

## Hook Breakdowns

### `useEditorInit.js`
```js
/**
 * GrapesJS initialize karo aur sab plugins register karo.
 * Returns: { editor } — GrapesJS instance
 */
export function useEditorInit({ containerRef }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return

    const editor = grapesjs.init({
      container: containerRef.current,
      ...getGrapesConfig(),
    })

    registerAllPlugins(editor)
    editorRef.current = editor

    return () => { editor.destroy(); editorRef.current = null }
  }, [])

  return { editor: editorRef.current }
}
```

### `useEditorSave.js`
```js
/**
 * Editor content backend pe save karo.
 * - Campaign page mode: saveCampaignPage()
 * - Template mode: saveTemplate()
 */
export function useEditorSave({ editor, campaignId, currentPage }) {
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    if (!editor || saving) return
    setSaving(true)
    try {
      if (campaignId) {
        await saveCampaignPage(editor, campaignId, currentPage)
      } else {
        await saveTemplate(editor)
      }
    } finally {
      setSaving(false)
    }
  }, [editor, campaignId, currentPage, saving])

  return { save, saving }
}
```

---

## `grapesConfig.js` Cleanup

Yeh file already exist karta hai lekin commented lines aur old configs hain.

**Action:**
1. Dead/commented code remove karo
2. Options group karo (canvas, storage, panels, assets)
3. Magic numbers → named constants

```js
// BEFORE: Scattered options with magic numbers
storageManager: {
  type: 'remote',
  autosave: true,
  autoload: false,
  stepsBeforeSave: 1,
  options: { ... }
}

// AFTER: Named constants
const STORAGE_CONFIG = {
  type: 'remote',
  autosave: true,
  autoload: false,
  stepsBeforeSave: AUTOSAVE_STEPS,  // const AUTOSAVE_STEPS = 1
  options: { ... }
}
```

---

## Plugins Folder — Naming Review

| Current | Rename To | Reason |
|---|---|---|
| `editorExperience.js` | `editorPolish.js` | "experience" vague hai |
| `dragUnstick.js` | Fine | Descriptive |
| `canvasEnhancements.js` | `canvasExtensions.js` | "enhancements" vague |
| `pagesManager.js` | Fine | Descriptive |
| `textEditing.js` | Fine | Descriptive |

---

## `DragDebugOverlay.jsx` — Delete?

```
editor/shell/DragDebugOverlay.jsx
```

Yeh debug file lagti hai. Check karo:
- Koi imports hain iske?
- Production mein show hota hai?
- Agar sirf development ke liye hai → `NODE_ENV` guard add karo ya delete karo

---

## Editor Performance Issues to Fix

### 1. GrapesJS Init Every Render
```jsx
// BAD: editor re-init on every render
useEffect(() => {
  const editor = grapesjs.init(...)
}) // No deps array!

// GOOD: Sirf once init karo
useEffect(() => {
  const editor = grapesjs.init(...)
  return () => editor.destroy()
}, []) // Empty deps
```

### 2. Event Listeners Cleanup
```js
// BAD: Event listeners add karo but remove mat karo
editor.on('change', handleChange)

// GOOD: Cleanup return karo
editor.on('change', handleChange)
return () => editor.off('change', handleChange)
```

### 3. Canvas Save Ke Baad State Sync
Currently save ke baad koi confirmation nahi milta. Add karo:
```js
// After save
toast.success('Page saved successfully')
// Or if failed:
toast.error('Save failed — please try again')
```
