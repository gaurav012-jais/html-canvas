import { safeGetWrapper } from '../../utils/editorUtils'
import useStore from '../../../store/useStore'

export function setupSectionNaming(ed, getIsMounted) {
  const onComponentAdd = (component) => {
    const parent = component.parent()
    const isTopLevel =
      parent && (parent.get('type') === 'wrapper' || parent === safeGetWrapper(ed))
    if (!isTopLevel) return

    const tag = (component.get('tagName') || '').toLowerCase()
    const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article'])
    const isSection =
      SECTION_TAGS.has(tag) || component.getAttributes()?.['data-tc-type'] === 'section'
    if (!isSection || tag === 'header' || tag === 'footer') return

    const html = component.toHTML ? component.toHTML() : ''
    const text = (component.getEl?.()?.textContent || '').toLowerCase()

    let proposed = ''
    if (html.includes('<form') || text.includes('contact') || text.includes('get in touch')) {
      proposed = 'contact'
    } else if (
      text.includes('pricing') ||
      html.includes('pricing') ||
      text.includes('$') ||
      text.includes('/mo')
    ) {
      proposed = 'pricing'
    } else if (
      text.includes('features') ||
      text.includes('lightning fast') ||
      text.includes('responsive')
    ) {
      proposed = 'features'
    } else if (
      text.includes('about') ||
      text.includes('our team') ||
      text.includes('meet the team')
    ) {
      proposed = 'about'
    } else {
      const children = parent.components().models || []
      const nonHeaderSections = children.filter((c) => {
        const t = (c.get('tagName') || '').toLowerCase()
        return t !== 'header' && t !== 'nav'
      })
      if (nonHeaderSections.length === 0 || nonHeaderSections[0] === component) {
        proposed = 'hero'
      }
    }

    if (!proposed) proposed = 'section'

    let finalId = proposed
    let counter = 1
    if (proposed === 'section') {
      finalId = `section-${counter}`
    }

    const findConflict = (anchorId) => {
      let found = false
      ed.Pages.getAll().forEach((page) => {
        const root = page.getMainComponent()
        if (!root) return
        const walk = (cmp) => {
          if (cmp === component) return
          if (cmp.getAttributes()?.id === anchorId) found = true
          cmp.components().forEach(walk)
        }
        walk(root)
      })
      return found
    }

    while (findConflict(finalId)) {
      if (proposed === 'section') {
        counter++
        finalId = `section-${counter}`
      } else {
        finalId = `${proposed}-${counter}`
        counter++
      }
    }

    setTimeout(() => {
      if (!getIsMounted() || !safeGetWrapper(ed)) return
      component.setId(finalId)
      component.set('sectionId', finalId)

      let label = 'Section'
      if (proposed === 'hero') label = 'Hero Section'
      else if (proposed === 'features') label = 'Features Section'
      else if (proposed === 'pricing') label = 'Pricing Section'
      else if (proposed === 'contact') label = 'Contact Section'
      else if (proposed === 'about') label = 'About Section'
      else if (proposed.startsWith('section-')) label = `Section ${proposed.split('-')[1]}`

      component.set('sectionLabel', label)
    }, 0)
  }

  const onComponentRemove = (removedComponent) => {
    const id = removedComponent.getAttributes()?.id || removedComponent.getId()
    if (!id) return

    const root = safeGetWrapper(ed)
    if (!root) return

    const walk = (cmp) => {
      const href = cmp.getAttributes()?.href
      if (href === `#${id}`) {
        cmp.addAttributes({ href: '#' })
        const addToast = useStore.getState().addToast
        if (typeof addToast === 'function') {
          addToast(
            `Section "#${id}" was deleted. Intersecting navigation links have been reset.`,
            'info'
          )
        }
      }
      cmp.components().forEach(walk)
    }
    walk(root)
  }

  ed.on('component:add', onComponentAdd)
  ed.on('component:remove', onComponentRemove)

  return () => {
    ed.off('component:add', onComponentAdd)
    ed.off('component:remove', onComponentRemove)
  }
}
