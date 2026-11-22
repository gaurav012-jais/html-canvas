import { priorityCheckApi } from '../../../services/api/flow'
import { evaluatePriorityApiMatch } from '../../../services/flow/priorityApiMatch'
import { logPriorityApiStep } from '../../../services/flow/apiDebugLog'
import { VALID_PAGES } from '../constants'
import { pageForChecksubStatus } from '../flowHelpers'
import { createPriorityNavigators } from './priorityNavigation'

export function validateApiUrl(rawUrl, tag) {
  const trimmed = (rawUrl || '').trim()
  const isInvalidUrl =
    !trimmed ||
    trimmed === 'https://' ||
    trimmed === 'http://' ||
    trimmed === 'https:///' ||
    trimmed === 'http:///'
  if (isInvalidUrl) {
    console.error(`[Priority Chain] ${tag} FAIL — API URL missing/incomplete:`, trimmed || '(empty)')
    throw new Error(`${tag} Error: API URL is missing or incomplete ("${trimmed || ''}")`)
  }

  const tempUrl = trimmed.replace(/\{\{[^}]+\}\}/g, 'placeholder')
  if (!tempUrl.startsWith('/')) {
    try {
      const parsed = new URL(tempUrl)
      if (!parsed.hostname) {
        console.error(`[Priority Chain] ${tag} FAIL — API URL host missing:`, trimmed)
        throw new Error(`${tag} Error: API URL host is missing ("${trimmed}")`, {
          cause: new Error(String(trimmed || 'Missing API URL host')),
        })
      }
    } catch (e) {
      if (e.message?.startsWith('Priority ')) throw e
      console.error(`[Priority Chain] ${tag} FAIL — Invalid API URL format:`, trimmed)
      throw new Error(`${tag} Error: Invalid API URL format ("${trimmed}")`, {
        cause: e,
      })
    }
  }
}

export function resolveUrlMacros(rawUrl, { phone, country, operator } = {}) {
  return String(rawUrl || '')
    .replace(/\{\{msisdn\}\}/gi, phone || '')
    .replace(/\{\{phone\}\}/gi, phone || '')
    .replace(/\{\{country\}\}/gi, country || '')
    .replace(/\{\{operator\}\}/gi, operator || '')
}

export async function processPriorityApiStep({
  step,
  index,
  totalSteps,
  tag,
  country,
  operator,
  phoneRef,
  visitIdRef,
  clickIdRef,
  rcidRef,
  pageDataRef,
  saveSession,
  setSearchParams,
  loadPage,
  onOutcome,
}) {
  const rawUrl = (step.url || '').trim()
  validateApiUrl(rawUrl, tag)

  if ((rawUrl.includes('{{msisdn}}') || rawUrl.includes('{{phone}}')) && !phoneRef.current) {
    console.warn(`[Priority Chain] ${tag} SKIP — phone/msisdn not available yet → next step`)
    return { handled: false }
  }

  const formattedUrl = resolveUrlMacros(rawUrl, {
    phone: phoneRef.current,
    country,
    operator,
  })

  console.log(`[Priority Chain] ${tag} calling:`, formattedUrl)

  const navigators = createPriorityNavigators({
    tag,
    country,
    operator,
    phoneRef,
    visitIdRef,
    saveSession,
    setSearchParams,
    loadPage,
    onOutcome,
  })

  let resOk = false
  let json = null
  let fetchFailed = false
  let fetchError = null
  const isAbsoluteHttp =
    formattedUrl.startsWith('http://') || formattedUrl.startsWith('https://')

  try {
    if (isAbsoluteHttp) {
      const proxied = await priorityCheckApi(formattedUrl, {
        visitId: visitIdRef.current,
        campaignId: pageDataRef.current?.campaignId,
        msisdn: phoneRef.current,
        clickId: clickIdRef.current || undefined,
        rcid: rcidRef.current || undefined,
        stepIndex: index,
        pageType: pageDataRef.current?.pageType,
        rules: step.rules || undefined,
        successKey: step.successKey || undefined,
        successValue: step.successValue,
      })
      resOk = Boolean(proxied?.ok)
      json = proxied?.body ?? null
      if (!resOk) {
        fetchFailed = true
        fetchError = proxied?.error || `HTTP ${proxied?.status || 0}`
      }
    } else {
      let res = null
      try {
        res = await fetch(formattedUrl, { method: 'GET', mode: 'cors' })
      } catch (err) {
        fetchFailed = true
        fetchError = err
      }
      if (fetchFailed || !res || !res.ok) {
        fetchFailed = true
        if (!fetchError) {
          fetchError = { status: res?.status, statusText: res?.statusText }
        }
      } else {
        resOk = true
        json = await res.json().catch(() => null)
      }
    }
  } catch (err) {
    fetchFailed = true
    fetchError = err
  }

  if (fetchFailed || !resOk) {
    logPriorityApiStep({
      tag,
      url: formattedUrl,
      ok: false,
      status: fetchError?.status || null,
      body: json,
      outcome: 'FAIL network/CORS/HTTP',
      error: fetchError,
    })
    const navigated = await navigators.goConfiguredOrContinue(
      step.failAction,
      step.failPage,
      'API fail → configured destination',
      step.failUrl,
    )
    if (navigated) return { handled: true }
    console.warn(`[Priority Chain] ${tag} → next step`)
    return { handled: false }
  }

  if (json) {
    if (json.responseCode === '500') {
      console.error(
        `[Priority Chain] ${tag} FAIL — engine error:`,
        json.responseMessage || json,
      )
      const navigated = await navigators.goConfiguredOrContinue(
        step.failAction,
        step.failPage,
        'engine error → configured destination',
        step.failUrl,
      )
      if (navigated) return { handled: true }
      throw new Error(
        `Priority ${index + 1} Check Failed: ${json.responseMessage || 'Engine error'}`,
      )
    }

    const matchResult = evaluatePriorityApiMatch(json, step)
    const shouldSkipSubscribe = matchResult.matched

    logPriorityApiStep({
      tag,
      url: formattedUrl,
      ok: true,
      status: 200,
      body: json,
      matchResult,
      outcome: shouldSkipSubscribe
        ? `MATCH → ${matchResult.go || 'page'} ${matchResult.page || matchResult.url || ''}`
        : 'NO_MATCH',
    })

    if (shouldSkipSubscribe) {
      if (matchResult.go === 'external') {
        if (
          navigators.redirectExternal(
            matchResult.url,
            `rule ${matchResult.key}=${matchResult.actual}`,
          )
        ) {
          return { handled: true }
        }
      } else {
        const fromRule = String(matchResult.page || '')
          .trim()
          .toUpperCase()
        const configuredMatch = String(step.matchPage || '')
          .trim()
          .toUpperCase()
        const targetPage = VALID_PAGES.includes(fromRule)
          ? fromRule
          : VALID_PAGES.includes(configuredMatch)
            ? configuredMatch
            : pageForChecksubStatus(matchResult.currentStatus) || 'THANKYOU'
        await navigators.navigateChainPage(
          targetPage,
          matchResult.mode === 'rules' || matchResult.mode === 'rule'
            ? `rule ${matchResult.key}=${matchResult.actual}`
            : `status=${matchResult.currentStatus || 'active'} (legacy)`,
        )
        return { handled: true }
      }
    }

    // Success rule did not match
    const missNavigated = await navigators.goConfiguredOrContinue(
      step.missAction,
      step.missPage,
      'rule fail → configured destination',
      step.missUrl,
    )
    if (missNavigated) return { handled: true }

    const isLastStep = index === totalSteps - 1
    if (isLastStep) {
      const fallbackNavigated = await navigators.goConfiguredOrContinue(
        step.failAction === 'page' || step.failAction === 'external'
          ? step.failAction
          : step.missAction,
        step.failAction === 'page' || step.failAction === 'external'
          ? step.failPage
          : step.missPage,
        'rule fail + no next step → fallback',
        step.failAction === 'external'
          ? step.failUrl
          : step.missAction === 'external'
            ? step.missUrl
            : '',
      )
      if (fallbackNavigated) return { handled: true }
      console.warn(
        `[Priority Chain] ${tag} FAIL — no match, no next step, no fallback page`,
      )
    } else {
      console.warn(`[Priority Chain] ${tag} FAIL — no match → next step`)
    }
  } else {
    console.warn(`[Priority Chain] ${tag} FAIL — empty/invalid JSON`)
    const navigated = await navigators.goConfiguredOrContinue(
      step.failAction,
      step.failPage,
      'invalid JSON → configured destination',
      step.failUrl,
    )
    if (navigated) return { handled: true }
    console.warn(`[Priority Chain] ${tag} → next step`)
  }

  return { handled: false }
}
