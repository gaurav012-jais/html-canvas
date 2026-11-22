import { getActiveStylesheetsContent, transformReactComponentsInHtml } from '../utils/styleUtils'
import {
  FLOW_RUNTIME_CSS,
  FLOW_RUNTIME_STYLESHEET_HREFS,
  RESPONSIVE_STYLE_RULES,
} from './flowRuntimeCss'

export { RESPONSIVE_STYLE_RULES }

export function slugifyFilename(value) {
  return value.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'page'
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function minifyCss(css) {
  if (!css) return ''
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;])\s*/g, '$1')
    .trim()
}

export function optimizePageContent(
  html,
  css,
  pages,
  activePageFilename,
  isPreview = false,
) {
  if (!html?.trim()) {
    return { optimizedHtml: '', optimizedCss: '' }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const refMap = new Map()
  pages.forEach((p) => {
    const pageId = String(p.id).toLowerCase()
    refMap.set(pageId, p.filename)
    refMap.set(`#${pageId}`, p.filename)
    refMap.set(`#page-${pageId}`, p.filename)

    const nameSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    refMap.set(nameSlug, p.filename)
    refMap.set(`#${nameSlug}`, p.filename)
    refMap.set(p.name.toLowerCase(), p.filename)
  })

  // Rewrite links
  const links = doc.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (!href) return

    const cleanHref = href.trim()
    let pagePart = cleanHref
    let sectionPart = ''
    const hashIndex = cleanHref.indexOf('#')

    if (hashIndex > -1) {
      pagePart = cleanHref.substring(0, hashIndex)
      sectionPart = cleanHref.substring(hashIndex + 1)
    }

    const pagePartNoSlash = pagePart.replace(/^\/|\/$/g, '')
    const lowerPagePart = pagePartNoSlash.toLowerCase()
    const lowerSectionPart = sectionPart.toLowerCase()

    let targetFilename = null

    if (pagePart) {
      if (refMap.has(lowerPagePart)) {
        targetFilename = refMap.get(lowerPagePart)
      } else if (refMap.has(pagePartNoSlash)) {
        targetFilename = refMap.get(pagePartNoSlash)
      }
    } else if (sectionPart) {
      if (refMap.has(lowerSectionPart)) {
        targetFilename = refMap.get(lowerSectionPart)
        sectionPart = ''
      } else if (refMap.has(`#${lowerSectionPart}`)) {
        targetFilename = refMap.get(`#${lowerSectionPart}`)
        sectionPart = ''
      }
    }

    if (targetFilename) {
      if (isPreview) {
        if (targetFilename === activePageFilename) {
          link.setAttribute('href', sectionPart ? `#${sectionPart}` : '#')
        } else {
          link.setAttribute('href', `javascript:void(0);`)
          link.setAttribute('data-target-page', targetFilename)
          link.setAttribute('title', `Links to ${targetFilename}`)
        }
      } else {
        const finalHref = sectionPart ? `${targetFilename}#${sectionPart}` : targetFilename
        link.setAttribute('href', finalHref)
      }
    }
  })

  return {
    optimizedHtml: doc.body.innerHTML,
    optimizedCss: css,
  }
}

export function renderPageDocument(
  title,
  bodyHtml,
  css,
  pages = [],
  filename = 'index.html',
  isPreview = false,
) {
  const { optimizedHtml } = optimizePageContent(bodyHtml, css, pages, filename, isPreview)
  const finalHtml = transformReactComponentsInHtml(optimizedHtml)
  const editorStylesheets = getActiveStylesheetsContent()
  const customCss = minifyCss(css || '')

  const previewScript = isPreview
    ? `
<script>
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var targetPage = a.getAttribute('data-target-page');
    if (targetPage) {
      e.preventDefault();
      window.parent.postMessage({ type: 'TC_NAVIGATE_PAGE', page: targetPage }, '*');
      return;
    }
    var href = (a.getAttribute('href') || '').trim();
    if (href.startsWith('#') && href.length > 1) {
      var id = decodeURIComponent(href.slice(1));
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, true);
</script>`
    : ''

  const fontLinks = FLOW_RUNTIME_STYLESHEET_HREFS.map(
    (href) => `<link rel="stylesheet" href="${href}">`,
  ).join('\n  ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${fontLinks}
  <style>
/* ── Flow runtime CSS ── */
${FLOW_RUNTIME_CSS}

/* ── Canvas active stylesheets ── */
${editorStylesheets}

/* ── Custom page styles ── */
${customCss}
  </style>
</head>
<body class="flow-page-inner">
  ${finalHtml}
  ${previewScript}
</body>
</html>`
}

export function buildHtmlDocument(
  title,
  bodyHtml,
  css,
  pages = [],
  filename = 'index.html',
) {
  return renderPageDocument(title, bodyHtml, css, pages, filename, false)
}

export function buildPreviewDocument(
  title,
  bodyHtml,
  css,
  pages = [],
) {
  if (!bodyHtml?.trim()) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#64748b;"><p>No content yet. Add blocks in the editor.</p></body></html>`
  }
  return renderPageDocument(title, bodyHtml, css, pages, 'index.html', true)
}
