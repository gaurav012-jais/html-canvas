import { getCanvasFrameEl } from './canvasFrameUtils'

/**
 * Clean & standard viewport adjustment for GrapesJS devices.
 * Sets standard CSS overrides inside iframe without breaking outer canvas transforms.
 */
export function applyDeviceViewport(editor, deviceName) {
  const frameEl = getCanvasFrameEl(editor)
  if (!frameEl) return

  const frameDoc = frameEl.contentDocument
  if (!frameDoc) return

  let metaVP = frameDoc.getElementById('tc-viewport-meta')
  if (!metaVP) {
    metaVP = frameDoc.createElement('meta')
    metaVP.id = 'tc-viewport-meta'
    metaVP.name = 'viewport'
    const existing = frameDoc.querySelector('meta[name="viewport"]')
    if (existing) existing.remove()
    frameDoc.head?.appendChild(metaVP)
  }

  const targetWidths = { Mobile: '375', Tablet: '768' }
  const vpWidth = targetWidths[deviceName] ?? ''
  metaVP.content = vpWidth
    ? `width=${vpWidth}, initial-scale=1.0`
    : 'width=device-width, initial-scale=1.0'

  let deviceOverride = frameDoc.getElementById('tc-device-override')
  if (!deviceOverride) {
    deviceOverride = frameDoc.createElement('style')
    deviceOverride.id = 'tc-device-override'
    frameDoc.head?.appendChild(deviceOverride)
  }

  if (deviceName === 'Mobile') {
    deviceOverride.textContent = `
      .tc-nav-hamburger {
        display: flex !important;
        font-size: 24px !important;
        cursor: pointer !important;
      }
      header, [data-tc-type="section"] > header {
        position: relative !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 16px !important;
      }
      header nav, header > nav,
      header nav[style], header > nav[style] {
        display: none !important;
        flex-direction: column !important;
        width: 100% !important;
        order: 3 !important;
        background: #fff !important;
        padding: 12px 16px !important;
        border-top: 1px solid #e2e8f0 !important;
        gap: 8px !important;
      }
      header nav a, header > nav a {
        width: 100% !important;
        text-align: center !important;
        padding: 10px 16px !important;
        display: block !important;
        white-space: normal !important;
      }
      .tc-nav-toggle:checked ~ nav,
      .tc-nav-toggle:checked ~ nav[style] {
        display: flex !important;
      }
      h1 { font-size: clamp(24px, 8vw, 32px) !important; }
      h2 { font-size: clamp(20px, 6vw, 26px) !important; }
    `
  } else if (deviceName === 'Tablet') {
    deviceOverride.textContent = `
      header, [data-tc-type="section"] > header {
        padding: 16px 20px !important;
      }
      header nav { gap: 16px !important; }
      section { padding: 48px 24px !important; }
    `
  } else {
    deviceOverride.textContent = `html, body { overflow-x: hidden; max-width: 100%; }`
  }

  const frameBody = frameDoc.body
  if (frameBody) {
    frameBody.classList.add('tc-device-repaint')
    requestAnimationFrame(() => frameBody.classList.remove('tc-device-repaint'))
  }
}

/**
 * Automatically adjusts element alignment and images when device mode switches.
 */
export function autoAlignCanvasComponents(editor, deviceName) {
  const frameEl = getCanvasFrameEl(editor)
  const doc = frameEl?.contentDocument
  if (!doc || !doc.body) return

  const isMobile = deviceName === 'Mobile'
  const isTablet = deviceName === 'Tablet'
  const targetWidth = isMobile ? 375 : isTablet ? 768 : 0

  const images = doc.querySelectorAll('img')
  images.forEach((img) => {
    if (img.closest?.('[data-tc-type="image-banner"]')) return
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
    img.style.objectFit = 'contain'
  })

  const absElements = doc.querySelectorAll(
    '[style*="position: absolute"], [style*="position:absolute"], [data-tc-type="hotspot"]'
  )

  absElements.forEach((el) => {
    if (el.getAttribute?.('data-tc-type') === 'hotspot') return
    if (el.closest?.('[data-tc-type="image-banner"]')) return
    if (deviceName === 'Desktop' || deviceName === 'Custom' || targetWidth === 0) {
      if (el.dataset.tcDesktopLeft !== undefined) {
        el.style.left = el.dataset.tcDesktopLeft
      }
      if (el.dataset.tcDesktopMaxWidth !== undefined) {
        el.style.maxWidth = el.dataset.tcDesktopMaxWidth
      }
      return
    }

    if (el.dataset.tcDesktopLeft === undefined) {
      el.dataset.tcDesktopLeft = el.style.left || ''
    }
    if (el.dataset.tcDesktopMaxWidth === undefined) {
      el.dataset.tcDesktopMaxWidth = el.style.maxWidth || ''
    }

    const origLeftStr = el.dataset.tcDesktopLeft || el.style.left || ''
    if (origLeftStr && origLeftStr.endsWith('px')) {
      const origLeft = parseFloat(origLeftStr)
      if (!isNaN(origLeft) && origLeft > 0) {
        const desktopBaseline = 1200
        const ratio = origLeft / desktopBaseline
        let newLeft = Math.round(ratio * targetWidth)
        const elWidth = el.offsetWidth || 100

        if (newLeft + elWidth > targetWidth - 12) {
          newLeft = Math.max(12, targetWidth - elWidth - 12)
        }
        el.style.left = `${newLeft}px`
      }
    }

    el.style.maxWidth = `calc(${targetWidth}px - 24px)`
  })
}
