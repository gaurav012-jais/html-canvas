import { describe, it, expect, vi } from 'vitest'
import {
  createShadowPackClickHandler,
  createShadowAnchorClickHandler,
} from '../shadowActionRouter'

describe('shadowActionRouter event handlers', () => {
  it('pack click handler updates selectedPackRef when pack button is clicked', () => {
    const selectedPackRef = { current: 'daily' }
    const transitionLockRef = { current: false }
    const shadow = document.createElement('div')

    const handler = createShadowPackClickHandler({
      shadow,
      transitionLockRef,
      selectedPackRef,
    })

    const packBtn = document.createElement('button')
    packBtn.setAttribute('data-pack', 'weekly')

    const event = {
      composedPath: () => [packBtn],
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    handler(event)
    expect(selectedPackRef.current).toBe('weekly')
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
  })

  it('pack click handler ignores clicks when transition is locked', () => {
    const selectedPackRef = { current: 'daily' }
    const transitionLockRef = { current: true }
    const shadow = document.createElement('div')

    const handler = createShadowPackClickHandler({
      shadow,
      transitionLockRef,
      selectedPackRef,
    })

    const packBtn = document.createElement('button')
    packBtn.setAttribute('data-pack', 'monthly')

    const event = {
      composedPath: () => [packBtn],
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    handler(event)
    expect(selectedPackRef.current).toBe('daily')
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('anchor click handler triggers direct loadPage for valid campaign page tokens', async () => {
    const shadow = document.createElement('div')
    const transitionLockRef = { current: false }
    const pageDataRef = { current: { pageType: 'HOME' } }
    const warnIfHeUnresolved = vi.fn().mockReturnValue(false)
    const setTransitioning = vi.fn()
    const setError = vi.fn()
    const loadPage = vi.fn().mockResolvedValue(true)

    const handler = createShadowAnchorClickHandler({
      shadow,
      transitionLockRef,
      pageDataRef,
      warnIfHeUnresolved,
      setTransitioning,
      setError,
      loadPage,
    })

    const anchor = document.createElement('a')
    anchor.setAttribute('href', 'CONFIRM')

    const event = {
      composedPath: () => [anchor],
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    handler(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(loadPage).toHaveBeenCalledWith('CONFIRM', { direct: true })
  })
})
