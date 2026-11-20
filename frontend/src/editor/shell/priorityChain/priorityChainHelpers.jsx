import { Pencil } from 'lucide-react'
import { PAGE_TYPES, PAGE_TYPE_LABELS } from '../../../services/api/campaigns'
import { normalizeApiRules } from '../../../services/flow/priorityApiMatch'
import { useEditor } from '../../context/EditorContext'
import { campaignEditPath } from '../../../utils/routes'

export const inputClass =
  'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200'

export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  )
}

export function getCampaignPageOptions() {
  return PAGE_TYPES.map((id) => ({
    id,
    label: PAGE_TYPE_LABELS[id] || id,
  }))
}

export function usePageEditHref(pageType) {
  const { campaignId, countryCode, operatorCode, funnelPageType } = useEditor()
  if (!campaignId || !pageType) return null
  if (String(pageType).toUpperCase() === String(funnelPageType || '').toUpperCase()) {
    return null
  }
  return campaignEditPath(countryCode, operatorCode, campaignId, pageType)
}

export function PageSelect({ value, onChange, label = 'Page' }) {
  const options = getCampaignPageOptions()
  const matched = options.find((o) => o.id.toLowerCase() === String(value || '').toLowerCase())
  const selected = matched?.id || options[0]?.id || 'OTP'
  const editHref = usePageEditHref(selected)

  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <select className={inputClass} value={selected} onChange={(e) => onChange(e.target.value)}>
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
          Edit {PAGE_TYPE_LABELS[selected] || selected} page
        </a>
      )}
    </div>
  )
}

/** Campaign page OR external website destination. */
export function DestinationFields({
  go = 'page',
  page = 'OTP',
  url = '',
  onGoChange,
  onPageChange,
  onUrlChange,
  goLabel = 'Then go to',
}) {
  return (
    <div className="space-y-2">
      <Field label={goLabel}>
        <select
          className={inputClass}
          value={go === 'external' ? 'external' : 'page'}
          onChange={(e) => onGoChange(e.target.value)}
        >
          <option value="page">A page in this campaign</option>
          <option value="external">A website</option>
        </select>
      </Field>
      {go === 'external' ? (
        <Field label="Website URL">
          <input
            className={inputClass}
            placeholder="https://example.com/offer"
            value={url || ''}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        </Field>
      ) : (
        <PageSelect label="Which page" value={page || 'OTP'} onChange={onPageChange} />
      )}
    </div>
  )
}

export function defaultApiStep() {
  return {
    type: 'api',
    url: '',
    rules: [
      { key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' },
      { key: 'currentStatus', value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
      { key: 'currentStatus', value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
      { key: 'currentStatus', value: 'new', go: 'page', page: 'CONFIRM', url: '' },
    ],
    missAction: 'page',
    missPage: 'ERROR',
    missUrl: '',
    failAction: 'page',
    failPage: 'ERROR',
    failUrl: '',
  }
}

export function ensureApiRules(step) {
  const rules = normalizeApiRules(step)
  if (rules.length > 0) return { ...step, rules }
  return { ...step, rules: defaultApiStep().rules }
}
