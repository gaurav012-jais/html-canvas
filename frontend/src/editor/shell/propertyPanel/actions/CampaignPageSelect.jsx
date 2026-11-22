import { Pencil } from 'lucide-react'
import { PAGE_TYPE_LABELS } from '../../../../services/api/campaigns'
import { inputClass } from '../TypographyControls'
import { Field } from '../propertyPanelUtils'
import { getCampaignPageOptions } from './clickActionConstants'

export function CampaignPageSelect({
  href,
  onChange,
  label = 'Page name',
  editHref,
}) {
  const options = getCampaignPageOptions()
  const matched = options.find((o) => o.id.toLowerCase() === (href || '').toLowerCase())
  const value = matched?.id || options[0]?.id || 'OTP'

  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((page) => (
            <option key={page.id} value={page.id}>
              {page.label}
            </option>
          ))}
        </select>
      </Field>
      {editHref && (
        <a
          href={editHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          <Pencil className="w-3 h-3" />
          Edit {PAGE_TYPE_LABELS[value] || value} page
        </a>
      )}
    </div>
  )
}
