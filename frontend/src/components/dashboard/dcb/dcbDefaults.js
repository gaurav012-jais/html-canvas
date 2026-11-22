export const DEFAULT_PURCHASE_TYPE_MAPPINGS = [
  { packKey: 'daily', label: 'Daily', purchaseTypeId: '2' },
  { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3' },
  { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '4' },
  { packKey: 'yearly', label: 'Yearly', purchaseTypeId: '10' },
  {
    packKey: 'monthly-with-ads',
    label: 'Monthly with Ads',
    purchaseTypeId: '11',
  },
  {
    packKey: 'three-months',
    label: 'Three Months',
    purchaseTypeId: '12',
  },
]

export const DEFAULT_DCB_ENDPOINTS = {
  publicConfig: '/api/dcb/config/public',
  subscriptions: '/api/dcb/subscriptions',
  pincode: '/api/dcb/pincode',
  confirm: '/api/dcb/confirmation',
}

export const DEFAULT_DCB_REQUEST_FIELDS = {
  merchantIdField: 'merchantId',
  serviceIdField: 'serviceId',
  purchaseTypeIdField: 'purchaseTypeId',
  msisdnField: 'msisdn',
  transactionChannelField: 'transactionChannel',
  operatorField: 'operator',
  subscriptionField: 'subscription',
  requestIdField: 'id',
  pinField: 'pinCode',
  currentField: 'current',
}

export const DEFAULT_DCB_CONFIG = {
  baseUrl: 'https://bilunipal.tickhighs.com',
  merchantId: '169',
  serviceId: '581',
  operatorCode: 'WM',
  confirmMethod: 'PUT',
  purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS,
  skipSinglePackPage: false,
  pollIntervalMs: 2000,
  pollTimeoutMs: 60000,
  endpoints: { ...DEFAULT_DCB_ENDPOINTS },
  request: { ...DEFAULT_DCB_REQUEST_FIELDS },
  responsePaths: {
    envelope: 'data',
    items: 'data.items',
    status: 'status',
    entitlementActive: 'entitlementActive',
    current: 'current',
    serviceId: 'providerServiceId',
    requestId: 'data.PinInfo.ID',
  },
}

export const CLASSIC_PACK_OPTIONS = [
  { packKey: 'daily', label: 'Daily', purchaseTypeId: '' },
  { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '' },
  { packKey: 'monthly', label: 'Monthly', purchaseTypeId: '' },
]

export function cloneDefaults() {
  return {
    ...DEFAULT_DCB_CONFIG,
    purchaseTypeMappings: DEFAULT_PURCHASE_TYPE_MAPPINGS.map((item) => ({ ...item })),
    endpoints: { ...DEFAULT_DCB_ENDPOINTS },
    request: { ...DEFAULT_DCB_REQUEST_FIELDS },
    responsePaths: { ...DEFAULT_DCB_CONFIG.responsePaths },
  }
}

export function endpointPath(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && value.path) return String(value.path).trim()
  return fallback
}

export function normalizeNamed(raw, fallback) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return Object.fromEntries(
    Object.entries(fallback).map(([key, defaultValue]) => [key, String(source[key] ?? defaultValue ?? '').trim() || defaultValue])
  )
}

export function normalizeEndpoints(raw, fallback) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return Object.fromEntries(
    Object.entries(fallback).map(([key, defaultValue]) => [key, endpointPath(source[key], defaultValue)])
  )
}

export function normalizeMappings(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      packKey: String(item?.packKey || item?.pack || `plan-${index + 1}`),
      label: String(item?.label || item?.name || item?.packKey || `Plan ${index + 1}`),
      purchaseTypeId: String(item?.purchaseTypeId ?? item?.id ?? ''),
    }))
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([packKey, value]) => ({
      packKey,
      label: String(value?.label || value?.name || packKey),
      purchaseTypeId: String(
        value && typeof value === 'object' ? (value.purchaseTypeId ?? value.id ?? '') : (value ?? '')
      ),
    }))
  }
  return DEFAULT_PURCHASE_TYPE_MAPPINGS.map((item) => ({ ...item }))
}
