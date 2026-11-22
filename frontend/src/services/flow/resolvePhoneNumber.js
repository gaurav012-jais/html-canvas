/**
 * MSISDN / phone resolution for the subscription funnel.
 *
 * Priority order:
 * 1. URL params (msisdn, phone, mobile) — testing / deep links
 * 2. window.__templatecraft_resolvePhone() — your custom async hook
 * 3. resolvePhoneFromOperator() below — paste operator SDK here
 * 4. sessionStorage / localStorage
 * 5. window.__TC_MSISDN__ or window.msisdn — injected by external script
 * 6. localhost dev fallback (development only)
 */

import { detectMsisdnApi } from '../api/flow'
import { resolveSafaricomMaskedInBrowser } from './safaricomHe'
import {
  normalizeMsisdn,
  formatMsisdnWithCountryCode,
  resolvePhoneFromUrl,
  resolvePhoneFromStorage,
  resolvePhoneFromWindow,
  persistPhone,
  isHeRedirectUrl,
  pickHeFailRedirectUrl,
  appendHeAttributionToUrl,
  resolveCustomHook,
  redirectFields,
  detectDecisionFields,
  isApiHeProviderName,
} from './resolvePhoneHelpers'

export {
  normalizeMsisdn,
  formatMsisdnWithCountryCode,
  resolvePhoneFromUrl,
  resolvePhoneFromStorage,
  resolvePhoneFromWindow,
  persistPhone,
  isHeRedirectUrl,
  pickHeFailRedirectUrl,
  appendHeAttributionToUrl,
}

function mapDetectResponse(res) {
  if (!res) return null
  return {
    phone: normalizeMsisdn(res.phone),
    subscribed: res.subscribed,
    isActive: Boolean(res.isActive),
    subscriptionStatus: res.subscriptionStatus || null,
    blocked: res.blocked,
    blockReason: res.blockReason || null,
    nextPage: res.nextPage || null,
    heProvider: res.heProvider || null,
    heError: res.heError || null,
    needsClientHe: Boolean(res.needsClientHe),
    heClientConfig: res.heClientConfig || null,
    failRedirectUrl: res.failRedirectUrl || null,
    successRedirectUrl: res.successRedirectUrl || null,
    cgRedirectUrl: res.cgRedirectUrl || null,
    externalRedirect: res.externalRedirect || null,
    visitId: res.visitId || null,
    clickId: res.clickId || null,
    rcid: res.rcid || null,
    campaignId: res.campaignId || null,
    verificationMode: res.verificationMode || null,
    flowContext: res.flowContext || null,
  }
}

/**
 * Resolves phone number from operator header enrichment API.
 * Always returns an object (phone may be empty) so fail/success redirects stay available.
 *
 * Safaricom masked HE: detect may return needsClientHe → browser token/MSISDN
 * (safwap parity) → second detect with heSource=browser.
 */
export async function resolvePhoneFromOperator(context = {}) {
  try {
    let res = await detectMsisdnApi(context)
    if (!res) return null

    if (res.needsClientHe && res.heClientConfig) {
      const browserHe = await resolveSafaricomMaskedInBrowser(res.heClientConfig, {
        sessionId: context.sessionId,
      })
      res = await detectMsisdnApi({
        ...context,
        phone: browserHe.phone || undefined,
        visitId: res.visitId || context.visitId,
        clickId: res.clickId || context.clickId,
        rcid: res.rcid || context.rcid,
        sessionId: browserHe.sessionId || context.sessionId,
        heSource: 'browser',
        heClientLogs: browserHe.heClientLogs,
        heClientError: browserHe.error || undefined,
      })
      if (!res) {
        return {
          phone: normalizeMsisdn(browserHe.phone),
          subscribed: false,
          isActive: false,
          subscriptionStatus: null,
          blocked: false,
          blockReason: null,
          nextPage: null,
          heProvider: 'safaricom_masked',
          heError: browserHe.error || null,
          failRedirectUrl: null,
          successRedirectUrl: null,
          cgRedirectUrl: null,
          visitId: null,
          clickId: null,
          rcid: null,
          campaignId: null,
        }
      }
    }

    return mapDetectResponse(res)
  } catch (err) {
    console.warn('[resolvePhoneFromOperator] detection failed:', err)
  }
  return null
}

function resolveDevFallback() {
  return ''
}

export async function resolvePhoneNumber(searchParams, context = {}) {
  const fromUrl = resolvePhoneFromUrl(searchParams)
  // Still hit detect for HE redirect URLs even when msisdn is already in the query.
  const operatorRes = await resolvePhoneFromOperator(context)
  const apiHeNoPhone =
    isApiHeProviderName(operatorRes?.heProvider) &&
    operatorRes &&
    !normalizeMsisdn(operatorRes.phone)

  // API HE failed (no phone from partner) — ignore stale URL/custom msisdn so
  // failRedirectUrl runs instead of getting stuck on "Redirecting…".
  if (apiHeNoPhone) {
    return {
      phone: '',
      source: 'operator',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes.heProvider,
      heError: operatorRes.heError,
      ...redirectFields(operatorRes),
    }
  }

  if (fromUrl) {
    persistPhone(fromUrl)
    return {
      phone: fromUrl,
      source: 'url',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  const fromCustom = await resolveCustomHook()
  if (fromCustom) {
    persistPhone(fromCustom)
    return {
      phone: fromCustom,
      source: 'custom',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  if (operatorRes?.phone) {
    const phone = normalizeMsisdn(operatorRes.phone)
    persistPhone(phone)
    return {
      phone,
      source: 'operator',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes.heProvider,
      heError: operatorRes.heError,
      ...redirectFields(operatorRes),
    }
  }

  // Token/API HE with no MSISDN — do not fall back to storage/window; use fail redirect.
  if (isApiHeProviderName(operatorRes?.heProvider) && operatorRes) {
    return {
      phone: '',
      source: 'operator',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes.heProvider,
      heError: operatorRes.heError,
      ...redirectFields(operatorRes),
    }
  }

  const fromStorage = resolvePhoneFromStorage()
  if (fromStorage) {
    return {
      phone: fromStorage,
      source: 'storage',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  const fromWindow = resolvePhoneFromWindow()
  if (fromWindow) {
    persistPhone(fromWindow)
    return {
      phone: fromWindow,
      source: 'window',
      ...detectDecisionFields(operatorRes),
      heProvider: operatorRes?.heProvider,
      heError: operatorRes?.heError,
      ...redirectFields(operatorRes),
    }
  }

  const devPhone = resolveDevFallback()
  if (devPhone) return { phone: devPhone, source: 'dev' }

  return {
    phone: '',
    source: operatorRes ? 'operator' : 'none',
    heProvider: operatorRes?.heProvider || null,
    heError: operatorRes?.heError || null,
    ...redirectFields(operatorRes),
  }
}
