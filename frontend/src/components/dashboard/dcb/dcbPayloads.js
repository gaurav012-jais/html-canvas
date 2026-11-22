import {
  DEFAULT_DCB_ENDPOINTS,
  DEFAULT_DCB_REQUEST_FIELDS,
  CLASSIC_PACK_OPTIONS,
  cloneDefaults,
  normalizeEndpoints,
  normalizeNamed,
  normalizeMappings,
} from './dcbDefaults'

export function parseDcbConfig(raw) {
  const fallback = cloneDefaults()
  if (!raw) return fallback
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return fallback
    const responsePaths = parsed.responsePaths || parsed.paths || {}
    const pollIntervalMs = Number(parsed.pollIntervalMs)
    const pollTimeoutMs = Number(parsed.pollTimeoutMs)
    const rawConfirmMethod = String(
      parsed.confirmMethod || parsed.endpoints?.confirmMethod || fallback.confirmMethod || 'PUT',
    ).trim().toUpperCase()
    const confirmMethod = ['PUT', 'POST', 'GET'].includes(rawConfirmMethod) ? rawConfirmMethod : 'PUT'

    return {
      baseUrl: String(parsed.baseUrl || fallback.baseUrl),
      merchantId: String(parsed.merchantId ?? fallback.merchantId),
      serviceId: String(parsed.serviceId ?? fallback.serviceId),
      operatorCode: String(parsed.operatorCode || fallback.operatorCode),
      confirmMethod,
      purchaseTypeMappings: normalizeMappings(
        parsed.purchaseTypeMappings || parsed.purchaseTypes || parsed.purchaseTypeMap
      ),
      skipSinglePackPage: parsed.skipSinglePackPage === true,
      pollIntervalMs: Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : fallback.pollIntervalMs,
      pollTimeoutMs: Number.isFinite(pollTimeoutMs) && pollTimeoutMs > 0 ? pollTimeoutMs : fallback.pollTimeoutMs,
      endpoints: {
        ...normalizeEndpoints(parsed.endpoints, fallback.endpoints),
        confirmMethod,
      },
      request: normalizeNamed(parsed.request || parsed.requestFields, fallback.request),
      responsePaths: {
        ...fallback.responsePaths,
        ...Object.fromEntries(Object.entries(responsePaths).map(([key, value]) => [key, String(value || '')])),
      },
    }
  } catch {
    return fallback
  }
}

export function serializeDcbConfig(config) {
  const normalized = parseDcbConfig(config)
  const confirmMethod = normalized.confirmMethod || 'PUT'
  return JSON.stringify({
    ...normalized,
    baseUrl: normalized.baseUrl.trim().replace(/\/+$/, ''),
    merchantId: normalized.merchantId.trim(),
    serviceId: normalized.serviceId.trim(),
    operatorCode: normalized.operatorCode.trim(),
    confirmMethod,
    purchaseTypeMappings: normalized.purchaseTypeMappings
      .map((item) => ({
        packKey: String(item.packKey || '').trim(),
        label: String(item.label || '').trim(),
        purchaseTypeId: String(item.purchaseTypeId || '').trim(),
      }))
      .filter((item) => item.packKey && item.purchaseTypeId),
    skipSinglePackPage: normalized.skipSinglePackPage === true,
    endpoints: {
      ...Object.fromEntries(
        Object.entries(normalized.endpoints).map(([key, value]) => [key, String(value || '').trim() || DEFAULT_DCB_ENDPOINTS[key]])
      ),
      confirmMethod,
    },
    request: Object.fromEntries(
      Object.entries(normalized.request).map(([key, value]) => [
        key,
        String(value || '').trim() || DEFAULT_DCB_REQUEST_FIELDS[key],
      ])
    ),
    responsePaths: Object.fromEntries(
      Object.entries(normalized.responsePaths).map(([key, value]) => [key, String(value || '').trim()])
    ),
  })
}

export function previewPincodePayload(config) {
  const current = parseDcbConfig(config)
  const fields = current.request
  return {
    [fields.merchantIdField]: Number(current.merchantId) || current.merchantId,
    [fields.serviceIdField]: Number(current.serviceId) || current.serviceId,
    [fields.purchaseTypeIdField]: 3,
    [fields.msisdnField]: '566891023',
    [fields.transactionChannelField]: 'Wifi',
    [fields.operatorField]: current.operatorCode,
    [fields.subscriptionField]: '',
  }
}

export function previewConfirmPayload(config) {
  const current = parseDcbConfig(config)
  const fields = current.request
  return {
    [fields.requestIdField]: 'REQUEST-ID-FROM-PIN-RESPONSE',
    [fields.pinField]: '1234',
    [fields.msisdnField]: '566891023',
    [fields.serviceIdField]: Number(current.serviceId) || current.serviceId,
    [fields.purchaseTypeIdField]: 3,
  }
}

export function joinUrl(baseUrl, path) {
  const base = String(baseUrl || '').replace(/\/+$/, '')
  const p = String(path || '')
  if (/^https?:\/\//i.test(p)) return p
  if (!base) return p
  return `${base}${p.startsWith('/') ? p : `/${p}`}`
}

export function editorPackOptions(raw, { universeDcb = false } = {}) {
  const mappings = parseDcbConfig(raw).purchaseTypeMappings
    .map((item) => ({
      packKey: String(item.packKey || '').trim(),
      label: String(item.label || item.packKey || '').trim(),
      purchaseTypeId: String(item.purchaseTypeId || '').trim(),
    }))
    .filter((item) => item.packKey)
  if ((raw || universeDcb) && mappings.length) return mappings
  return CLASSIC_PACK_OPTIONS
}
