import { isOverImageContext } from '../overlayStacking'
import { getComp } from '../editorUtils'

export const TEXT_TAGS = new Set([
  'button',
  'a',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'li',
])

export const FLOW_ACTIONS = new Set(['SUBSCRIBE', 'SUBSCRIBE_ROUTE', 'CONFIRM', 'CHAIN'])
export const FLOW_OTP = new Set(['send', 'verify'])

export const MIN_BTN_HEIGHT = 44
export const MIN_BTN_WIDTH = 48

export function parsePx(value) {
  if (value == null || value === '') return null
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

export function isButtonLikeComponent(component) {
  const comp = getComp(component)
  if (!comp) return false
  const tag = (typeof comp.get === 'function' ? comp.get('tagName') : comp.tagName) || ''
  const type = (typeof comp.get === 'function' ? comp.get('type') : comp.type) || ''
  const attrs = comp.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']
  const tagLower = tag.toLowerCase()
  return (
    tagLower === 'button' ||
    type === 'link' ||
    tcType === 'button' ||
    (tagLower === 'a' && tcType !== 'hotspot')
  )
}

export function isTextSizedComponent(component) {
  const comp = getComp(component)
  if (!comp) return false
  const tag = (typeof comp.get === 'function' ? comp.get('tagName') : comp.tagName) || ''
  const type = (typeof comp.get === 'function' ? comp.get('type') : comp.type) || ''
  const attrs = comp.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']

  if (tcType === 'hotspot') return false
  if (isButtonLikeComponent(comp)) return true
  if (TEXT_TAGS.has(tag.toLowerCase()) || type === 'text') return true
  return false
}

export function isFlowLayoutButton(component) {
  const comp = getComp(component)
  if (!comp || !isButtonLikeComponent(comp)) return false
  const attrs = comp.getAttributes?.() || {}
  if (attrs['data-tc-type'] === 'hotspot') return false
  return true
}

export function wasIntentionallyAbsolute(component) {
  const comp = getComp(component)
  if (!comp) return false
  const attrs = comp.getAttributes?.() || {}
  if (attrs['data-tc-type'] === 'hotspot') return true
  if (attrs['data-tc-absolute'] === '1' || attrs['data-tc-absolute'] === 'true') return true

  const style = comp.getStyle?.() || {}
  const pos = String(style.position || '').toLowerCase()
  if (pos === 'absolute' && isOverImageContext(comp)) return true
  return false
}

export const BLOCK_CONTAINER_TAGS = new Set([
  'section',
  'header',
  'footer',
  'nav',
  'main',
  'div',
  'article',
  'aside',
  'form',
])

export function isResizableBlockContainer(component) {
  const comp = getComp(component)
  if (!comp) return false
  if (isButtonLikeComponent(comp) || isFlowLayoutButton(comp)) return false

  const tag = (typeof comp.get === 'function' ? comp.get('tagName') : comp.tagName) || ''
  const type = (typeof comp.get === 'function' ? comp.get('type') : comp.type) || ''
  const attrs = comp.getAttributes?.() || {}
  const tcType = attrs['data-tc-type']
  const tagLower = tag.toLowerCase()

  if (type === 'wrapper' || tagLower === 'body' || tagLower === 'html') return false
  if (tcType === 'hotspot' || tcType === 'button' || tcType === 'image') return false
  if (type === 'image' || tagLower === 'img') return false
  if (TEXT_TAGS.has(tagLower) || type === 'text') return false

  if (tcType === 'section' || tcType === 'image-banner') return true
  return BLOCK_CONTAINER_TAGS.has(tagLower)
}
