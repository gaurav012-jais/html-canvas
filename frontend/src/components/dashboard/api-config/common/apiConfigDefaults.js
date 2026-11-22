import { PAGE_TYPES } from '../../../../services/api/campaigns'

export const DEFAULT_ORANGE_BF_CONFIG = {
  baseUrl: 'http://103.153.58.55',
  serviceId: 'Health Portal Livliness',
  subServiceId: 'Health Portal Livliness pass jour',
  cpId: '100',
  channel: 'ussd',
  country: 'BF',
  operator: 'ORG',
  language: '_E',
  successKey: 'responseCode',
  successValue: '0',
  sendUrl: '',
  sendMethod: 'GET',
  sendBodyJson: '',
  verifyUrl: '',
  verifyMethod: 'GET',
  verifyBodyJson: '',
  checksubUrl: '',
  checksubMethod: 'GET',
  checksubBodyJson: '',
  headersJson: '',
  syncEnabled: true,
  syncUrl:
    'http://103.153.58.55/Subs_Engine/subscription/sync?msisdn={{msisdn}}&subServiceId={{subServiceId}}&serviceId={{serviceId}}&cpId={{cpId}}&channel={{channel}}&country={{country}}&operator={{operator}}&reqType=1',
  syncMethod: 'GET',
  syncServiceId: 'Health Portal Livliness NAR',
  syncSubServiceId: 'Health Portal Livliness acte jour',
  syncReqType: '1',
  syncBodyJson: '',
}

export const DEFAULT_PARTNER = {
  sendUrl: '',
  verifyUrl: '',
  method: 'GET',
  verifyMethod: 'GET',
  headersJson: '',
  bodyJson: '',
  verifyBodyJson: '',
  successKey: 'responseCode',
  successValue: '0',
  payoutPercent: 100,
}

export function clampPayoutPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

export const DEFAULT_CHECKSUB = {
  statusField: 'currentStatus',
  rules: [],
  missGo: 'continue',
  missPage: 'ERROR',
  missUrl: '',
}

export const CHECKSUB_PAGE_OPTIONS = PAGE_TYPES.filter((id) =>
  ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR', 'HOME', 'OTP', 'CONFIRM'].includes(id),
)

export function parseChecksubConfig(raw) {
  if (!raw) return { ...DEFAULT_CHECKSUB, rules: [] }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CHECKSUB, rules: [] }
    }
    const rules = Array.isArray(parsed.rules)
      ? parsed.rules.map((r) => ({
          value: r?.value != null ? String(r.value) : '',
          go: r?.go === 'page' || r?.go === 'external' ? r.go : 'continue',
          page: r?.page || 'THANKYOU',
          url: r?.url || '',
        }))
      : []
    return {
      statusField: parsed.statusField || 'currentStatus',
      rules,
      missGo: parsed.missGo === 'page' || parsed.missGo === 'external' ? parsed.missGo : 'continue',
      missPage: parsed.missPage || 'ERROR',
      missUrl: parsed.missUrl || '',
    }
  } catch {
    return { ...DEFAULT_CHECKSUB, rules: [] }
  }
}

export function serializeChecksubConfig(cfg) {
  if (!cfg) return null
  const rules = (cfg.rules || [])
    .map((r) => ({
      value: String(r.value || '').trim(),
      go: r.go === 'page' || r.go === 'external' ? r.go : 'continue',
      page: r.page || 'THANKYOU',
      url: String(r.url || '').trim(),
    }))
    .filter((r) => r.value)
  const statusField = String(cfg.statusField || 'currentStatus').trim() || 'currentStatus'
  const missGo = cfg.missGo === 'page' || cfg.missGo === 'external' ? cfg.missGo : 'continue'
  const isDefault = rules.length === 0 && statusField === 'currentStatus' && missGo === 'continue'
  if (isDefault) return null
  return JSON.stringify({
    statusField,
    rules,
    missGo,
    missPage: cfg.missPage || 'ERROR',
    missUrl: String(cfg.missUrl || '').trim(),
  })
}

export const HE_MODES = [
  {
    id: 'header',
    title: 'Network header',
    subtitle: 'X-MSISDN from carrier (default)',
  },
  {
    id: 'none',
    title: 'Off',
    subtitle: 'OTP only — no auto-detect',
  },
  {
    id: 'custom_http',
    title: 'Custom API',
    subtitle: 'Operator resolve URL',
  },
  {
    id: 'safaricom_masked',
    title: 'Token + MSISDN',
    subtitle: 'Token API then masked number',
  },
]

export const EMPTY_HE_FIELDS = {
  tokenUrl: '',
  maskedUrl: '',
  resolveUrl: '',
  failMessage: '',
  failRedirectUrl: '',
  successRedirectUrl: '',
}

export function parseHeConfig(raw) {
  if (!raw) return { ...EMPTY_HE_FIELDS }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_HE_FIELDS }
    return {
      tokenUrl: parsed.tokenUrl || parsed.heTokenUrl || '',
      maskedUrl: parsed.maskedUrl || parsed.maskedMsisdnUrl || '',
      resolveUrl: parsed.url || parsed.resolveUrl || '',
      failMessage: parsed.failMessage || '',
      failRedirectUrl: parsed.failRedirectUrl || parsed.heFailRedirectUrl || '',
      successRedirectUrl: parsed.successRedirectUrl || parsed.heSuccessRedirectUrl || '',
    }
  } catch {
    return { ...EMPTY_HE_FIELDS }
  }
}

export function buildHeConfigJson(provider, fields, resolveMsisdnUrl) {
  if (provider === 'header' || provider === 'none') return ''

  const out = {}
  if (provider === 'safaricom_masked') {
    if (fields.tokenUrl.trim()) out.tokenUrl = fields.tokenUrl.trim()
    if (fields.maskedUrl.trim()) out.maskedUrl = fields.maskedUrl.trim()
  }
  if (provider === 'custom_http') {
    const url = (fields.resolveUrl || resolveMsisdnUrl || '').trim()
    if (url) out.url = url
  }
  if (fields.failMessage.trim()) out.failMessage = fields.failMessage.trim()
  if (fields.failRedirectUrl.trim()) {
    out.failRedirectUrl = fields.failRedirectUrl.trim()
  }
  if (fields.successRedirectUrl.trim()) {
    out.successRedirectUrl = fields.successRedirectUrl.trim()
  }
  return Object.keys(out).length ? JSON.stringify(out, null, 2) : ''
}
