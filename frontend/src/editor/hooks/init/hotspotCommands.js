import {
  HOTSPOT_RESIZABLE,
  IMAGE_BANNER_STYLE,
  wrapImageAsBanner,
  isImageComponent,
} from '../../utils/overlayStacking'

export function registerHotspotCommands(ed) {
  ed.Components.addType('hotspot', {
    isComponent: (el) => el.getAttribute && el.getAttribute('data-tc-type') === 'hotspot',
    model: {
      defaults: {
        tagName: 'a',
        draggable: true,
        droppable: false,
        resizable: HOTSPOT_RESIZABLE,
        traits: [
          {
            type: 'text',
            name: 'href',
            label: 'Link URL',
          },
          {
            type: 'select',
            name: 'target',
            label: 'Open in',
            options: [
              { id: '_self', value: '_self', name: 'Same Window' },
              { id: '_blank', value: '_blank', name: 'New Window' },
            ],
          },
        ],
      },
    },
  })

  ed.Commands.add('tc-add-hotspot', {
    run(editor, _sender, opts = {}) {
      let target = opts.target || editor.getSelected()
      if (!target) {
        console.warn('[tc-add-hotspot] No valid target component')
        return
      }

      const targetTag = (target.get?.('tagName') || '').toLowerCase()
      const targetTc = target.getAttributes?.()?.['data-tc-type']

      if (targetTc === 'hotspot') {
        target = target.parent() || target
      } else if (targetTag === 'img' || targetTc === 'image') {
        const host = wrapImageAsBanner(target)
        if (host) target = host
      } else if (targetTc !== 'image-banner') {
        const kids = target.components?.()
        const len = kids?.length || 0
        for (let i = 0; i < len; i++) {
          const child = typeof kids.at === 'function' ? kids.at(i) : kids.models?.[i]
          if (child && isImageComponent(child)) {
            const host = wrapImageAsBanner(child)
            if (host) target = host
            break
          }
        }
      }

      if (typeof target.components !== 'function') {
        console.warn('[tc-add-hotspot] Target component cannot accept children')
        return
      }

      target.addStyle?.(IMAGE_BANNER_STYLE)
      const pStyle = target.getStyle?.() || {}
      if (!['absolute', 'relative', 'fixed'].includes(pStyle.position || '')) {
        target.addStyle?.({ position: 'relative' })
      }

      const hotspotStyle = opts.coverFull
        ? {
            position: 'absolute',
            top: '0%',
            left: '0%',
            width: '100%',
            height: '100%',
            display: 'block',
            'z-index': '50',
            cursor: 'pointer',
            'text-decoration': 'none',
          }
        : {
            position: 'absolute',
            top: '40%',
            left: '25%',
            width: '50%',
            height: '12%',
            display: 'block',
            'z-index': '50',
            cursor: 'pointer',
            'text-decoration': 'none',
          }

      const children = target.components()
      const hotspot = children.add({
        tagName: 'a',
        type: 'hotspot',
        attributes: {
          'data-tc-type': 'hotspot',
          'data-action': 'SUBSCRIBE',
          href: '#',
          title: 'Subscribe Hotspot',
          ...(opts.coverFull ? { 'data-tc-cover-full': '1' } : {}),
        },
        style: hotspotStyle,
        draggable: true,
        droppable: false,
        resizable: HOTSPOT_RESIZABLE,
        selectable: true,
        hoverable: true,
      })

      setTimeout(() => {
        try {
          const h = Array.isArray(hotspot) ? hotspot[0] : hotspot
          if (h) editor.select(h)
        } catch (e) {
          console.warn('[tc-add-hotspot] Select failed:', e)
        }
      }, 100)
    },
  })
}
