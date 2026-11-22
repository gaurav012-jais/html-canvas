import {
  isCampaignPageHref,
  normalizePack,
  shouldSelectPackOnly,
} from '../flowHelpers'
import { syncPackPicker } from '../shadowDom'

export function createShadowPackClickHandler({
  shadow,
  transitionLockRef,
  selectedPackRef,
}) {
  return (event) => {
    const packBtn = event
      .composedPath?.()
      .find((node) => node instanceof HTMLElement && node.hasAttribute('data-pack'))
    if (!packBtn || transitionLockRef.current) return
    if (!shouldSelectPackOnly(packBtn)) return
    event.preventDefault()
    event.stopPropagation()
    const nextPack = normalizePack(packBtn.getAttribute('data-pack'))
    selectedPackRef.current = nextPack
    syncPackPicker(shadow, nextPack)
  }
}

export function createShadowAnchorClickHandler({
  shadow,
  transitionLockRef,
  pageDataRef,
  warnIfHeUnresolved,
  setTransitioning,
  setError,
  loadPage,
}) {
  return (event) => {
    const path = event.composedPath?.() || []
    const anchor = path.find(
      (node) =>
        node instanceof HTMLElement &&
        (node instanceof HTMLAnchorElement || node.hasAttribute('href')),
    )
    if (!anchor) return
    if (anchor.getAttribute('data-action') || anchor.hasAttribute('data-actions')) return

    const href = (anchor.getAttribute('href') || '').trim()
    if (!href) return

    if (isCampaignPageHref(href)) {
      event.preventDefault()
      event.stopPropagation()
      if (transitionLockRef.current) return
      const onHome = String(pageDataRef.current?.pageType || '').toUpperCase() === 'HOME'
      if (onHome && warnIfHeUnresolved()) return
      const targetPage = href.toUpperCase()
      if (String(pageDataRef.current?.pageType || '').toUpperCase() === targetPage) return

      transitionLockRef.current = true
      setTransitioning(true)
      setError('')
      loadPage(targetPage, { direct: true }).finally(() => {
        setTransitioning(false)
        transitionLockRef.current = false
      })
      return
    }

    if (!href.startsWith('#') || href === '#') return

    event.preventDefault()
    const targetId = decodeURIComponent(href.slice(1))
    const targetEl = shadow.getElementById(targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}
