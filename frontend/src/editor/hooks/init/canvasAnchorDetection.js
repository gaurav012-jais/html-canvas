import { listSectionAnchorsOnPage } from '../../utils/sectionAnchor'

export function autoSuggestAnchorOnUpdate(ed, component, refreshSelection) {
  const tag = (component.get('tagName') || '').toLowerCase()
  const type = component.get('type') || ''
  if (tag === 'a' || type === 'link') {
    const text = (component.getEl?.()?.textContent || '').trim()
    if (text) {
      const href = component.getAttributes()?.href || ''
      if (!href || href === '#' || href.startsWith('#')) {
        const pageAnchors = listSectionAnchorsOnPage(ed, component)
        const normalized = text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9_-]/g, '')
        const common = ['features', 'pricing', 'contact', 'about', 'faq', 'services', 'hero']
        if (pageAnchors.includes(normalized) || common.includes(normalized)) {
          if (href !== `#${normalized}`) {
            component.addAttributes({ href: `#${normalized}` })
            refreshSelection()
          }
        }
      }
    }
  }
}
