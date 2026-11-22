import { createZipBlob } from '../../utils/zip'
import { sanitizeSavedPageHtml } from './wysiwygContract'
import {
  slugifyFilename,
  escapeHtml,
  minifyCss,
  optimizePageContent,
  renderPageDocument,
  buildHtmlDocument,
  buildPreviewDocument,
  RESPONSIVE_STYLE_RULES,
} from './exportDocument'

// Re-export so existing imports (`from './exportSite'`) keep working.
export {
  slugifyFilename,
  escapeHtml,
  minifyCss,
  optimizePageContent,
  renderPageDocument,
  buildHtmlDocument,
  buildPreviewDocument,
  RESPONSIVE_STYLE_RULES,
}

export function cleanLocalhostUrls(text) {
  if (!text) return ''
  return text.replace(/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/g, '')
}

export function stripWrapperIdFromCss(css) {
  if (!css) return ''
  return css.replace(/#wrapper\s+/gi, '')
}

export function inlineCssInHtml(html, css, wrapperStyle = '') {
  if (!html) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const stylesMap = new Map()

  if (css) {
    const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    const rules = cleanCss.split('}')
    rules.forEach((rule) => {
      const parts = rule.split('{')
      if (parts.length === 2) {
        const selector = parts[0].trim()
        const declarations = parts[1].trim()

        const classRegex = /\.([a-zA-Z0-9_-]+)/g
        let classMatch
        while ((classMatch = classRegex.exec(selector)) !== null) {
          const className = classMatch[1]
          const existing = stylesMap.get(className) || ''
          stylesMap.set(className, `${existing}; ${declarations}`.replace(/^;\s*/, ''))
        }
      }
    })
  }

  const allElements = doc.body.querySelectorAll('*')
  allElements.forEach((el) => {
    let combinedStyles = el.getAttribute('style') || ''

    const classes = Array.from(el.classList)
    classes.forEach((cls) => {
      const ruleStyles = stylesMap.get(cls)
      if (ruleStyles) {
        combinedStyles = `${combinedStyles}; ${ruleStyles}`.replace(/^;\s*/, '')
      }
    })

    if (combinedStyles) {
      el.setAttribute('style', combinedStyles)
    }
  })

  const innerHtml = doc.body.innerHTML
  return `<div class="page-wrapper" style="min-height: 100vh; width: 100%; position: relative; ${wrapperStyle}">${innerHtml}</div>`
}

/**
 * Canonical save snapshot for campaign pages / templates.
 * Persists GrapesJS component HTML+CSS only — runtime chrome (responsive, overlay,
 * fonts) lives in flowRuntimeCss and is injected at Preview/live render time so
 * canvas and SubscriptionPage stay in sync without bloating DB rows.
 */
export function getActivePageSnapshot(editor) {
  if (editor) {
    try {
      if (editor.Commands?.isActive?.('core:rte')) {
        editor.Commands.stop('core:rte')
      }
    } catch (_) {
      // ignore rte stop
    }
    try {
      if (editor.rte?.end) {
        editor.rte.end()
      }
    } catch (_) {
      // ignore rte end
    }
  }
  const selected = editor.Pages.getSelected()
  const main = selected?.getMainComponent() || editor.getWrapper()
  if (!main) return { html: '', css: '' }

  const rawHtml = editor.getHtml({ component: main })
  const rawCss = editor.getCss({ component: main, avoidProtected: true }) || ''
  const css = stripWrapperIdFromCss(rawCss)

  const styleObj = (main.getStyle?.() || {})
  const wrapperStyle = Object.entries(styleObj)
    .filter(([_, v]) => v !== null && v !== undefined && String(v).trim().length > 0)
    .map(([k, v]) => `${k}:${String(v).replace(/"/g, "'")}`)
    .join('; ')

  const inlinedHtml = `<div class="page-wrapper" style="min-height: 100vh; width: 100%; position: relative; ${wrapperStyle}">${rawHtml}</div>`
  // Final WYSIWYG gate: never persist stray absolute CTAs that break Preview
  const sanitized = sanitizeSavedPageHtml(inlinedHtml)

  return {
    html: cleanLocalhostUrls(sanitized),
    css: cleanLocalhostUrls(css),
  }
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename, content, mime = 'text/html') {
  downloadBlob(filename, new Blob([content], { type: mime }))
}

export function pageExportFilename(name, id, isHome) {
  if (isHome) return 'index.html'
  return `${slugifyFilename(name || id)}.html`
}

export function collectPageExports(editor) {
  const pages = editor.Pages.getAll()

  return pages.map((page, index) => {
    const main = page.getMainComponent()
    const pageId = String(page.getId())
    const pageName = String(page.get('name') || pageId)
    const isHome = index === 0 || pageId === 'home' || pageName.toLowerCase() === 'home'

    if (!main) {
      return { id: pageId, name: pageName, filename: pageExportFilename(pageName, pageId, isHome), html: '', css: '' }
    }

    const rawHtml = editor.getHtml({ component: main })
    const rawCss = editor.getCss({ component: main, avoidProtected: true }) || ''
    const css = stripWrapperIdFromCss(rawCss)

    const styleObj = (main.getStyle?.() || {})
    const wrapperStyle = Object.entries(styleObj)
      .filter(([_, v]) => v !== null && v !== undefined && String(v).trim().length > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join('; ')

    const inlinedHtml = `<div class="page-wrapper" style="min-height: 100vh; width: 100%; position: relative; ${wrapperStyle}">${rawHtml}</div>`

    return {
      id: pageId,
      name: pageName,
      filename: pageExportFilename(pageName, pageId, isHome),
      html: cleanLocalhostUrls(sanitizeSavedPageHtml(inlinedHtml)),
      css: cleanLocalhostUrls(css),
    }
  })
}

export function exportCurrentPageFromEditor(editor, siteTitle) {
  const selected = editor.Pages.getSelected()
  const main = selected?.getMainComponent() || editor.getWrapper()
  if (!main) return

  const pageName = String(selected?.get('name') || 'page')
  const { html, css } = getActivePageSnapshot(editor)
  const pages = collectPageExports(editor)
  const isHome = selected?.getId() === 'home' || pageName.toLowerCase() === 'home'
  const filename = pageExportFilename(pageName, String(selected?.getId()), isHome)

  const doc = buildHtmlDocument(`${siteTitle} — ${pageName}`, html, css, pages, filename)
  const base = slugifyFilename(siteTitle)
  const suffix = pageName.toLowerCase() === 'home' ? '' : `-${slugifyFilename(pageName)}`
  downloadTextFile(`${base}${suffix || ''}.html`, doc)
}

export function exportAllPagesFromEditor(editor, siteTitle) {
  const pages = collectPageExports(editor).filter((p) => p.html.trim())
  if (pages.length === 0) return

  const base = slugifyFilename(siteTitle)

  if (pages.length === 1) {
    const page = pages[0]
    downloadTextFile(`${base}.html`, buildHtmlDocument(siteTitle, page.html, page.css, pages, page.filename))
    return
  }

  const files = pages.map((page) => ({
    name: page.filename,
    content: buildHtmlDocument(`${siteTitle} — ${page.name}`, page.html, page.css, pages, page.filename),
  }))

  downloadBlob(`${base}-site.zip`, createZipBlob(files))
}
