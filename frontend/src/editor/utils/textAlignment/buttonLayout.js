import { getComp } from '../editorUtils'
import {
  MIN_BTN_HEIGHT,
  MIN_BTN_WIDTH,
  parsePx,
  isButtonLikeComponent,
  isTextSizedComponent,
  isFlowLayoutButton,
  wasIntentionallyAbsolute,
  isResizableBlockContainer,
} from './buttonDetection'

export function stripAbsoluteFromEl(el) {
  if (!el?.style) return
  if (el.style.position === 'absolute' || el.style.position === 'fixed') {
    el.style.position = ''
    el.style.top = ''
    el.style.left = ''
    el.style.right = ''
    el.style.bottom = ''
    el.style.zIndex = ''
  }
}

export function stripAbsoluteStyleAttribute(component) {
  const attrs = component.getAttributes?.() || {}
  const raw = attrs.style
  if (raw == null || raw === '') return
  const next = String(raw)
    .replace(/(?:^|;)\s*position\s*:\s*absolute\s*/gi, ';')
    .replace(/(?:^|;)\s*position\s*:\s*fixed\s*/gi, ';')
    .replace(/(?:^|;)\s*top\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*left\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*right\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*bottom\s*:\s*[^;]+/gi, ';')
    .replace(/(?:^|;)\s*z-index\s*:\s*[^;]+/gi, ';')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '')
    .trim()
  if (next === String(raw).trim()) return
  try {
    const patched = { ...attrs }
    if (next) patched.style = next
    else delete patched.style
    component.setAttributes?.(patched)
  } catch (_) {
    /* noop */
  }
}

export function resolveFlowButtonWidth(style = {}, el = null) {
  const raw = String(style.width || '').trim()
  if (raw === '100%' || /^100(\.0+)?%$/.test(raw)) return '100%'

  const px = parsePx(raw)
  if (px != null && String(raw).includes('%') && el && el.offsetWidth > 0) {
    return `${Math.max(MIN_BTN_WIDTH, Math.round(el.offsetWidth))}px`
  }
  if (px != null && String(raw).endsWith('px')) {
    return `${Math.max(MIN_BTN_WIDTH, Math.round(px))}px`
  }
  if (raw && raw !== 'auto') {
    return raw
  }

  if (el) {
    const inlineW = String(el.style?.width || '').trim()
    if (inlineW && inlineW !== 'auto') {
      if (/^100(\.0+)?%$/.test(inlineW)) return '100%'
      const inlinePx = parsePx(inlineW)
      if (inlinePx != null) return `${Math.max(MIN_BTN_WIDTH, Math.round(inlinePx))}px`
      return inlineW
    }
    try {
      if (el.parentElement && el.offsetWidth > 0 && el.parentElement.offsetWidth > 0) {
        if (el.offsetWidth >= el.parentElement.offsetWidth * 0.85) {
          return '100%'
        }
      }
    } catch (_) {
      /* noop */
    }
  }

  if (!raw || raw === 'auto') return 'auto'
  return raw
}

export function syncFlowButtonDom(el, minHeightPx, width = '100%') {
  if (!el?.style) return
  stripAbsoluteFromEl(el)
  const custom = width !== '100%'
  el.style.position = 'relative'
  el.style.width = width
  el.style.maxWidth = '100%'
  el.style.minWidth = custom ? `${MIN_BTN_WIDTH}px` : '0'
  el.style.height = ''
  el.style.minHeight = `${minHeightPx}px`
  el.style.boxSizing = 'border-box'
  if (el.style.display !== 'none') {
    el.style.display = custom ? 'inline-flex' : 'flex'
  }
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.alignSelf = custom ? 'center' : 'stretch'
  el.style.flexShrink = '0'
  el.style.overflow = 'visible'
  if (el.style.visibility !== 'hidden') {
    el.style.visibility = 'visible'
  }
  if (el.style.opacity === '0') el.style.opacity = '1'
  el.style.top = ''
  el.style.left = ''
  el.style.right = ''
  el.style.bottom = ''
  el.style.margin = ''
  el.style.zIndex = ''
}

export function keepFlowButtonInFlow(component) {
  const comp = getComp(component)
  if (!comp || !isFlowLayoutButton(comp)) return
  if (wasIntentionallyAbsolute(comp)) return

  stripAbsoluteStyleAttribute(comp)

  const prev = comp.getStyle?.() || {}
  let minH = parsePx(prev['min-height']) ?? parsePx(prev.height) ?? MIN_BTN_HEIGHT
  if (!Number.isFinite(minH) || minH < MIN_BTN_HEIGHT) minH = MIN_BTN_HEIGHT

  const el = typeof component.getEl === 'function' ? component.getEl() : null
  const width = resolveFlowButtonWidth(prev, el)
  const customWidth = width !== '100%'
  const minWidth = customWidth ? `${MIN_BTN_WIDTH}px` : '0'
  const alignSelf = customWidth ? 'center' : 'stretch'

  const pos = String(prev.position || '').toLowerCase()
  const hasAbsGeo =
    pos === 'absolute' ||
    pos === 'fixed' ||
    prev.top != null ||
    prev.left != null ||
    prev.right != null ||
    prev.bottom != null

  const elPos = String(el?.style?.position || '').toLowerCase()
  const elHasAbs =
    elPos === 'absolute' ||
    elPos === 'fixed' ||
    !!(el?.style?.top || el?.style?.left || el?.style?.right || el?.style?.bottom)

  const alreadyInFlow =
    !hasAbsGeo &&
    !elHasAbs &&
    (pos === 'relative' || pos === 'static' || pos === '') &&
    String(prev.width || '') === width &&
    String(prev['min-height'] || '') === `${minH}px` &&
    String(prev['min-width'] || '') === minWidth &&
    String(prev.display || '') === (customWidth ? 'inline-flex' : 'flex') &&
    String(prev['align-self'] || '') === alignSelf

  if (alreadyInFlow) return

  const style = {
    position: 'relative',
    width,
    'max-width': '100%',
    'min-width': minWidth,
    'min-height': `${minH}px`,
    display: customWidth ? 'inline-flex' : 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'align-self': alignSelf,
    'flex-shrink': '0',
    'box-sizing': 'border-box',
    overflow: 'visible',
    visibility: 'visible',
    'text-align': prev['text-align'] || 'center',
  }

  for (const key of [
    'background',
    'background-color',
    'color',
    'border',
    'border-radius',
    'padding',
    'font-size',
    'font-weight',
    'font-family',
    'box-shadow',
    'letter-spacing',
    'text-transform',
    'line-height',
  ]) {
    if (prev[key] != null && prev[key] !== '') style[key] = prev[key]
  }

  const hasClasses = (component.getClasses?.() || []).length > 0
  if (!hasClasses) {
    if (!style['background-color'] && !style.background) {
      style['background-color'] = '#2563eb'
    }
    if (!style.color) {
      style.color = '#ffffff'
    }
    if (!style['border-radius']) {
      style['border-radius'] = '8px'
    }
    if (!style.padding) {
      style.padding = '12px 24px'
    }
    if (!style['font-weight']) {
      style['font-weight'] = '600'
    }
    if (!style['text-decoration']) {
      style['text-decoration'] = 'none'
    }
  }

  component.setStyle(style)
  try {
    component.removeStyle?.('top')
    component.removeStyle?.('left')
    component.removeStyle?.('right')
    component.removeStyle?.('bottom')
    component.removeStyle?.('z-index')
    component.removeStyle?.('height')
  } catch (_) {
    /* noop */
  }

  syncFlowButtonDom(el, minH, width)
}

export function enforceFlowButtonSize(component) {
  keepFlowButtonInFlow(component)
}

export const FLOW_BUTTON_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: MIN_BTN_WIDTH,
  ratioDefault: 0,
  unitWidth: 'px',
  unitHeight: 'px',
  currentUnit: 0,
  keyWidth: 'width',
  keyHeight: 'min-height',
}

export const OVERLAY_BUTTON_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 24,
  ratioDefault: 0,
}

export function configureFlowButtonResizable(component) {
  const comp = getComp(component)
  if (!comp || !isFlowLayoutButton(comp)) return
  if (wasIntentionallyAbsolute(comp)) {
    comp.set('resizable', OVERLAY_BUTTON_RESIZABLE)
    return
  }
  comp.set('resizable', FLOW_BUTTON_RESIZABLE)
}

export const FLOW_BLOCK_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 40,
  ratioDefault: 0,
  keyHeight: 'min-height',
}

export const ABSOLUTE_BLOCK_RESIZABLE = {
  tl: 1,
  tc: 1,
  tr: 1,
  cl: 1,
  cr: 1,
  bl: 1,
  bc: 1,
  br: 1,
  minDim: 40,
  ratioDefault: 0,
}

export function configureBlockResizable(component) {
  const comp = getComp(component)
  if (!comp || !isResizableBlockContainer(comp)) return
  const style = comp.getStyle?.() || {}
  const isAbs =
    String(style.position || '').toLowerCase() === 'absolute' ||
    comp.getAttributes?.()?.['data-tc-absolute'] === '1'
  comp.set('resizable', isAbs ? ABSOLUTE_BLOCK_RESIZABLE : FLOW_BLOCK_RESIZABLE)
}

export function applyTextSizeAlignment(component, opts = {}) {
  const comp = getComp(component)
  if (!comp || typeof comp.addStyle !== 'function') return
  if (!isTextSizedComponent(comp)) return

  if (isFlowLayoutButton(comp) && !wasIntentionallyAbsolute(comp)) {
    keepFlowButtonInFlow(comp)
    return
  }

  const style = comp.getStyle?.() || {}
  const heightPx = parsePx(style.height) ?? parsePx(style['min-height'])
  if (!opts.force && (heightPx == null || heightPx <= 0)) return

  const buttonLike = isButtonLikeComponent(comp)
  const patch = {
    'box-sizing': 'border-box',
    'line-height': '1.25',
    overflow: 'visible',
  }

  if (buttonLike) {
    patch.display = 'inline-flex'
    patch['align-items'] = 'center'
    patch['justify-content'] = 'center'
    patch['text-align'] = style['text-align'] || 'center'
    if (heightPx < MIN_BTN_HEIGHT) patch['min-height'] = `${MIN_BTN_HEIGHT}px`
  } else {
    patch.display = 'flex'
    patch['align-items'] = 'center'
    patch['justify-content'] =
      style['text-align'] === 'right'
        ? 'flex-end'
        : style['text-align'] === 'center'
          ? 'center'
          : 'flex-start'
  }

  comp.addStyle(patch)
}
