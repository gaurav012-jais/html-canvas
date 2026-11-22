/**
 * Shared WYSIWYG runtime CSS for campaign pages.
 *
 * Contract: canvas iframe (non-editor chrome) and live SubscriptionPage shadow DOM
 * must inject the SAME rules so Save → Preview matches what operators see while editing.
 * Editor-only chrome (hover outlines, hotspot dashed borders) stays OUT of this file.
 *
 * Guardrails: frontend/src/editor/services/wysiwygContract.js
 * CI: tests/unit/wysiwygContract.test.js
 * Cursor rule: .cursor/rules/canvas-preview-wysiwyg.mdc
 */
import { OVERLAY_STACKING_CSS } from '../utils/overlayStacking'
import { TEXT_SIZE_ALIGN_CANVAS_CSS } from '../utils/textSizeAlign'
import { RESPONSIVE_STYLE_RULES } from './flowResponsiveRules'

export { RESPONSIVE_STYLE_RULES }

/** Fonts / icons loaded into both GrapesJS canvas and live shadow root. */
export const FLOW_RUNTIME_STYLESHEET_HREFS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
]

/**
 * Host chrome for live shadow + shared with canvas runtime (not editor outlines).
 * Deliberately does NOT force display:flex on .page-wrapper / first child —
 * that rewrote author layouts and caused canvas≠preview mismatch.
 */
export const FLOW_HOST_CSS = `
  :host {
    display: block;
    width: 100%;
    min-height: 100vh;
  }
  /* Live fills the viewport; customWidth is editor-only and must not cap Preview. */
  .flow-page-inner {
    display: block;
    width: 100%;
    max-width: 100%;
    margin: 0;
    opacity: 1;
    min-height: 100vh;
    height: auto !important;
    max-height: none !important;
    overflow-x: hidden;
    overflow-y: visible !important;
    box-sizing: border-box;
  }
  .flow-page-inner > * {
    max-width: 100%;
    min-width: 0;
  }
  .page-wrapper {
    min-height: 100vh;
    height: auto !important;
    width: 100%;
    position: relative;
    box-sizing: border-box;
    overflow: visible !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
  }
  .page-wrapper > * {
    max-width: 100%;
    box-sizing: border-box;
  }
  /* Grapes absolute-drag leaves left/top on template cards, which removes them from
     .home-page / .otp-container flex centering → card stuck to one side on large
     screens (and asymmetric inside customWidth frames). Real freeform overlays must
     use data-tc-absolute="1". Do NOT force display:flex on .page-wrapper. */
  .home-card:not([data-tc-absolute="1"]),
  .otp-card:not([data-tc-absolute="1"]),
  .confirm-card:not([data-tc-absolute="1"]),
  .wjo-card:not([data-tc-absolute="1"]),
  .bf-wellness-container:not([data-tc-absolute="1"]) {
    position: relative !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    bottom: auto !important;
    height: auto !important;
    margin-left: auto;
    margin-right: auto;
  }
  .flow-pack-option.flow-pack-selected {
    border-color: #7c4dff !important;
    background: #f5f3ff !important;
    box-shadow: 0 0 0 1px #7c4dff;
  }
  /* Keep resized button/text labels centered (matches editor) */
  button, a[data-tc-type="button"], .flow-btn {
    box-sizing: border-box;
  }
  button[style*="height"]:not([data-tc-absolute="1"]),
  a[data-tc-type="button"][style*="height"]:not([data-tc-absolute="1"]),
  .flow-btn[style*="height"]:not([data-tc-absolute="1"]) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1.25 !important;
  }
`

/** Full runtime bundle for live shadow DOM and HTML export documents. */
export const FLOW_RUNTIME_CSS = `
${FLOW_HOST_CSS}
${OVERLAY_STACKING_CSS}
${TEXT_SIZE_ALIGN_CANVAS_CSS}
${RESPONSIVE_STYLE_RULES}
`

/** <link> tags for shadow mount / static HTML head. */
export function flowRuntimeStylesheetLinks() {
  return FLOW_RUNTIME_STYLESHEET_HREFS.map(
    (href) => `<link rel="stylesheet" href="${href}" crossorigin="anonymous">`,
  ).join('\n')
}
