export const DCB_STAGES = new Set([
  'MANUAL_MSISDN',
  'MANUAL_CHECK',
  'MANUAL_ENTRY',
  'MSISDN_REQUIRED',
  'PLAN_SELECT',
  'SELECT_PLAN',
  'PLAN_REQUIRED',
  'PURCHASE_TYPE_SELECTION',
  'BILLING_PIN',
  'PIN_ENTRY',
  'PIN_SENT',
  'PIN_REQUIRED',
  'AUTH_OTP',
  'AUTHORIZATION_REQUIRED',
  'POLLING',
  'INPROGRESS',
])

export function normalizeDcbStage(pageData) {
  const context = pageData?.flowContext || {}
  return String(context.stage || context.step || context.action || '')
    .trim()
    .toUpperCase()
}

export function isDcbFlowContext(pageData) {
  const context = pageData?.flowContext
  if (!context || typeof context !== 'object') return false
  const marker = String(
    pageData?.verificationMode || context.verificationMode || context.mode || context.provider || '',
  ).toUpperCase()
  return (
    marker.includes('UNIVERSE') ||
    marker.includes('DCB') ||
    DCB_STAGES.has(normalizeDcbStage(pageData)) ||
    Array.isArray(context.purchaseTypes) ||
    Boolean(context.purchaseTypeId)
  )
}

export function normalizedOutcome(response) {
  return String(
    response?.outcome ||
      response?.routeOutcome ||
      response?.flowContext?.outcome ||
      response?.status ||
      '',
  )
    .trim()
    .toUpperCase()
}

export function pageForDcbOutcome(outcome, status, checksubConfig = null) {
  const normStatus = String(status || '').trim().toUpperCase()

  if (checksubConfig && Array.isArray(checksubConfig.rules) && checksubConfig.rules.length > 0) {
    for (const rule of checksubConfig.rules) {
      if (String(rule.value || '').trim().toUpperCase() === normStatus) {
        if (rule.go === 'page' && rule.page) return String(rule.page).toUpperCase()
        if (rule.go === 'continue') return 'HOME'
      }
    }
    if (checksubConfig.missPage && checksubConfig.missGo === 'page') {
      return String(checksubConfig.missPage).toUpperCase()
    }
  }

  if (normStatus === 'PENDING_PIN') return 'OTP'
  if (outcome === 'ENTITLED') return 'THANKYOU'
  if (outcome === 'LOW_BALANCE') return 'LOW_BALANCE'
  if (outcome === 'TERMINAL_FAILURE' || outcome === 'PARSE_ERROR') return 'ERROR'
  if (outcome === 'PENDING') return 'INPROGRESS'
  if (outcome === 'NEW') return 'HOME'
  return null
}

export async function routeDcbResponse(
  response,
  { currentPage, cachePage, loadPage, checksubConfig = null },
) {
  if (!response) return null
  const responseStage = String(response.stage || response.flowContext?.stage || '').toUpperCase()
  const explicitPage = String(response.nextPage || response.pageType || '')
    .trim()
    .toUpperCase()
  const cfg =
    checksubConfig || response?.flowContext?.checksubConfig || response?.checksubConfig || null
  const targetPage =
    (responseStage === 'PIN_REQUIRED' && !explicitPage ? 'OTP' : null) ||
    explicitPage ||
    pageForDcbOutcome(
      normalizedOutcome(response),
      response?.status || response?.flowContext?.status,
      cfg,
    )

  if (response.pageType && response.html) {
    cachePage(response)
    return response.pageType
  }
  if (targetPage && targetPage !== String(currentPage || '').toUpperCase()) {
    await loadPage(targetPage, { direct: true })
  } else if (response.pageType) {
    cachePage(response)
  }
  return targetPage
}

export function purchaseTypesFrom(source) {
  const raw =
    source?.purchaseTypes || source?.purchaseTypeMappings || source?.purchaseTypeMap || []
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([packKey, value]) => ({
      packKey,
      ...(value && typeof value === 'object' ? value : { purchaseTypeId: value }),
    }))
  }
  return []
}

export function resolvePurchaseType(source, packKey, directId) {
  if (directId) return String(directId)
  const wanted = String(packKey || '')
    .trim()
    .toLowerCase()
  const match = purchaseTypesFrom(source).find((item) => {
    const keys = [item?.packKey, item?.pack, item?.key, item?.slug, item?.id]
    return keys.some(
      (key) =>
        String(key || '')
          .trim()
          .toLowerCase() === wanted,
    )
  })
  return String(match?.purchaseTypeId ?? match?.id ?? '')
}
