import { inputClass } from '../TypographyControls'
import { Field } from '../propertyPanelUtils'

export function SectionAnchorSelect({
  editor,
  value,
  onChange,
}) {
  return (
    <Field label="Scroll to section">
      <select
        className={inputClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a section...</option>
        {(() => {
          const sections = []
          const wrapper = editor?.getWrapper?.()
          if (wrapper) {
            const walk = (cmp) => {
              const tag = (cmp.get('tagName') || '').toLowerCase()
              const SECTION_TAGS = new Set([
                'section',
                'header',
                'footer',
                'nav',
                'main',
                'article',
              ])
              const isSection =
                SECTION_TAGS.has(tag) ||
                cmp.getAttributes()?.['data-tc-type'] === 'section'
              if (isSection && tag !== 'header' && tag !== 'footer') {
                const id = cmp.getAttributes()?.id || cmp.getId()
                const label = cmp.get('sectionLabel') || id || 'Untitled Section'
                sections.push({ id, label })
              }
              cmp.components().forEach(walk)
            }
            walk(wrapper)
          }
          const seen = new Set()
          return sections
            .filter((s) => {
              if (seen.has(s.id)) return false
              seen.add(s.id)
              return true
            })
            .map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label} (#{sec.id})
              </option>
            ))
        })()}
      </select>
    </Field>
  )
}
