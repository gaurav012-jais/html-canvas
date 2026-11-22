import { PAGE_TYPES, PAGE_TYPE_LABELS } from '../../../../services/api/campaigns'

/** All funnel page types — every campaign can edit HOME … ERROR. */
export function getCampaignPageOptions() {
  return PAGE_TYPES.map((id) => ({
    id,
    label: PAGE_TYPE_LABELS[id] || id,
  }))
}

/** True for OTP system controls — pack buttons can still set When clicked. */
export function isLockedSystemAction(attrs = {}) {
  if (attrs['data-otp-action'] || attrs['data-otp-field'] || attrs['data-otp-slot']) return true
  if (attrs['data-flow-pack-picker'] !== undefined) return true
  return false
}

export function getClickActionType(attrs = {}) {
  if (attrs['data-action'] === 'CHAIN' || attrs['data-actions']) return 'chain'
  if (attrs['data-action'] === 'SUBSCRIBE_ROUTE') return 'subscribeRoute'
  const href = attrs.href
  if (href === undefined || href === null || href === '') {
    if (attrs['data-action']) return 'flow'
    return 'none'
  }
  // Prefer real navigation targets over a leftover SUBSCRIBE
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return 'external'
  }
  if (href.startsWith('#') && href !== '#') return 'anchor'
  // Signup / Confirm system CTAs
  if (attrs['data-action'] === 'SUBSCRIBE' || attrs['data-action'] === 'CONFIRM') return 'flow'
  if (href.startsWith('#')) return 'anchor'
  return 'page'
}
