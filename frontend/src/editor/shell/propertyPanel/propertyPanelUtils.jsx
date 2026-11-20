import { memo } from 'react'
import { getStyleProp, setStyleProp } from '../../utils/blockActions'
import { parseSpacing, formatSpacing } from '../../utils/spacingUtils'
import { MoveArrows, InnerSpaceArrows } from '../../components/SpacingArrows'

export const KIND_LABELS = {
  text: 'Text',
  button: 'Button',
  image: 'Photo',
  section: 'Section',
  generic: 'Block',
  link: 'Link',
  hotspot: 'Clickable Area',
  input: 'Input Field',
  none: 'Element',
}

export function toHex(color) {
  if (!color || typeof color !== 'string') return '#334155'
  if (color.startsWith('#')) {
    if (color.length === 7) return color
    if (color.length === 4) {
      const r = color[1]
      const g = color[2]
      const b = color[3]
      return `#${r}${r}${g}${g}${b}${b}`
    }
    return '#334155'
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) {
    const hex = (n) => Number(n).toString(16).padStart(2, '0')
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`
  }
  return '#334155'
}

export function getButtonSize(padding) {
  if (padding === '8px 16px') return 'sm'
  if (padding === '16px 32px') return 'lg'
  return 'md'
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  )
}

function PositionControlsComponent({ selected, update }) {
  const margin = parseSpacing(getStyleProp(selected, 'margin'))
  const padding = parseSpacing(getStyleProp(selected, 'padding'))

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <MoveArrows
        label="Move on page"
        value={margin}
        onChange={(v) => {
          setStyleProp(selected, 'margin', formatSpacing(v))
          update()
        }}
      />
      <InnerSpaceArrows
        label="Space inside"
        value={padding}
        onChange={(v) => {
          setStyleProp(selected, 'padding', formatSpacing(v))
          update()
        }}
      />
    </div>
  )
}

export const PositionControls = memo(PositionControlsComponent)
