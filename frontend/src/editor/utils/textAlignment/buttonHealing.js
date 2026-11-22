import {
  MIN_BTN_HEIGHT,
  isTextSizedComponent,
  isFlowLayoutButton,
  wasIntentionallyAbsolute,
} from './buttonDetection'
import {
  stripAbsoluteStyleAttribute,
  keepFlowButtonInFlow,
  configureFlowButtonResizable,
} from './buttonLayout'

export function healFlowButtonsInEditor(editor) {
  const wrapper = editor?.getWrapper?.()
  if (!wrapper) return 0
  let healed = 0
  const walk = (cmp) => {
    if (isFlowLayoutButton(cmp)) {
      if (wasIntentionallyAbsolute(cmp)) {
        configureFlowButtonResizable(cmp)
      } else {
        keepFlowButtonInFlow(cmp)
        configureFlowButtonResizable(cmp)
        healed += 1
      }
    } else if (isTextSizedComponent(cmp) && !wasIntentionallyAbsolute(cmp)) {
      stripAbsoluteStyleAttribute(cmp)
      const st = cmp.getStyle?.() || {}
      if (st.position === 'absolute' || st.position === 'fixed' || st.top != null || st.left != null) {
        cmp.addStyle({ position: 'relative' })
        cmp.removeStyle?.('top')
        cmp.removeStyle?.('left')
        cmp.removeStyle?.('right')
        cmp.removeStyle?.('bottom')
        cmp.removeStyle?.('z-index')
        healed += 1
      }
    }
    cmp.components?.()?.forEach?.(walk)
  }
  walk(wrapper)
  return healed
}

/**
 * Live funnel / Preview: strip accidental absolute px boxes on in-card CTAs and text blocks.
 * Real image overlays keep data-tc-absolute="1" and are left alone.
 */
export function healLiveFlowButtons(root) {
  if (!root?.querySelectorAll) return 0
  let healed = 0
  const nodes = root.querySelectorAll(
    'button, a, p, span, h1, h2, h3, h4, h5, h6, [data-action], [data-otp-action]',
  )
  nodes.forEach((el) => {
    try {
      if (el.getAttribute('data-tc-type') === 'hotspot') return
      if (
        el.getAttribute('data-tc-absolute') === '1' ||
        el.getAttribute('data-tc-absolute') === 'true'
      ) {
        return
      }
      const inlinePos = String(el.style?.position || '').toLowerCase()
      if (inlinePos === 'absolute' && (el.closest?.('[data-tc-type="image-banner"]') || el.parentElement?.querySelector?.('img'))) {
        return
      }
      const cs = el.ownerDocument?.defaultView?.getComputedStyle?.(el)
      const computedPos = String(cs?.position || '').toLowerCase()
      const isAbs = inlinePos === 'absolute' || inlinePos === 'fixed' || computedPos === 'absolute'
      if (!isAbs && !el.style.top && !el.style.left) return

      el.style.position = 'relative'
      el.style.top = ''
      el.style.left = ''
      el.style.right = ''
      el.style.bottom = ''
      el.style.zIndex = ''
      if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('data-action')) {
        el.style.width = el.style.width || '100%'
        el.style.maxWidth = '100%'
        el.style.minWidth = '0'
        el.style.display = el.style.display || 'inline-flex'
        el.style.alignItems = el.style.alignItems || 'center'
        el.style.justifyContent = el.style.justifyContent || 'center'
        el.style.alignSelf = 'stretch'
        el.style.boxSizing = 'border-box'
        if (!el.style.minHeight) el.style.minHeight = `${MIN_BTN_HEIGHT}px`
      }
      healed += 1
    } catch (_) {
      /* noop */
    }
  })
  return healed
}

export const TEXT_SIZE_ALIGN_CANVAS_CSS = `
  button.flow-btn:not([data-tc-absolute="1"]),
  .flow-btn:not([data-tc-absolute="1"]),
  button[data-action="SUBSCRIBE"]:not([data-tc-absolute="1"]),
  button[data-action="SUBSCRIBE_ROUTE"]:not([data-tc-absolute="1"]),
  button[data-action="CONFIRM"]:not([data-tc-absolute="1"]),
  button[data-otp-action]:not([data-tc-absolute="1"]) {
    box-sizing: border-box !important;
    max-width: 100% !important;
    min-width: 0 !important;
    min-height: ${MIN_BTN_HEIGHT}px;
  }
`
