import { describe, it, expect } from 'vitest'
import {
  MIN_BTN_HEIGHT,
  MIN_BTN_WIDTH,
  parsePx,
  isButtonLikeComponent,
  isTextSizedComponent,
  isFlowLayoutButton,
  wasIntentionallyAbsolute,
  isResizableBlockContainer,
  resolveFlowButtonWidth,
} from '../../textSizeAlign'

describe('textSizeAlign facade and submodules', () => {
  it('correctly parses pixel strings', () => {
    expect(parsePx('44px')).toBe(44)
    expect(parsePx('100.5px')).toBe(100.5)
    expect(parsePx(50)).toBe(50)
    expect(parsePx('')).toBeNull()
    expect(parsePx(null)).toBeNull()
    expect(parsePx('auto')).toBeNull()
  })

  it('correctly classifies button-like and text-sized components', () => {
    const btnComp = {
      get: (k) => (k === 'tagName' ? 'button' : ''),
      getAttributes: () => ({}),
    }
    expect(isButtonLikeComponent(btnComp)).toBe(true)
    expect(isTextSizedComponent(btnComp)).toBe(true)
    expect(isFlowLayoutButton(btnComp)).toBe(true)

    const hotspotComp = {
      get: (k) => (k === 'tagName' ? 'a' : ''),
      getAttributes: () => ({ 'data-tc-type': 'hotspot' }),
    }
    expect(isButtonLikeComponent(hotspotComp)).toBe(false)
    expect(isTextSizedComponent(hotspotComp)).toBe(false)
    expect(isFlowLayoutButton(hotspotComp)).toBe(false)

    const textComp = {
      get: (k) => (k === 'tagName' ? 'h1' : ''),
      getAttributes: () => ({}),
    }
    expect(isButtonLikeComponent(textComp)).toBe(false)
    expect(isTextSizedComponent(textComp)).toBe(true)
  })

  it('detects intentionally absolute components', () => {
    const absComp = {
      get: () => '',
      getAttributes: () => ({ 'data-tc-absolute': '1' }),
    }
    expect(wasIntentionallyAbsolute(absComp)).toBe(true)

    const normalComp = {
      get: () => '',
      getAttributes: () => ({}),
      getStyle: () => ({ position: 'relative' }),
    }
    expect(wasIntentionallyAbsolute(normalComp)).toBe(false)
  })

  it('classifies resizable block containers', () => {
    const secComp = {
      get: (k) => (k === 'tagName' ? 'section' : ''),
      getAttributes: () => ({}),
    }
    expect(isResizableBlockContainer(secComp)).toBe(true)

    const divComp = {
      get: (k) => (k === 'tagName' ? 'div' : ''),
      getAttributes: () => ({}),
    }
    expect(isResizableBlockContainer(divComp)).toBe(true)

    const bodyComp = {
      get: (k) => (k === 'tagName' ? 'body' : ''),
      getAttributes: () => ({}),
    }
    expect(isResizableBlockContainer(bodyComp)).toBe(false)
  })

  it('resolves flow button width with bounds clamping', () => {
    expect(resolveFlowButtonWidth({ width: '100%' })).toBe('100%')
    expect(resolveFlowButtonWidth({ width: '20px' })).toBe(`${MIN_BTN_WIDTH}px`)
    expect(resolveFlowButtonWidth({ width: '200px' })).toBe('200px')
    expect(resolveFlowButtonWidth({ width: 'auto' })).toBe('auto')
  })
})
