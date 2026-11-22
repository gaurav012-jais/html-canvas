import { VALID_PAGES } from '../constants'

export function createPriorityNavigators({
  tag,
  country,
  operator,
  phoneRef,
  visitIdRef,
  saveSession,
  setSearchParams,
  loadPage,
  onOutcome,
}) {
  const navigateChainPage = async (targetPage, reason) => {
    console.log(
      `%c[Priority Chain] ${tag} PASS — ${reason} → ${targetPage}`,
      'color:#16a34a;font-weight:bold',
    )
    onOutcome(`PASS_${targetPage}`)
    saveSession({
      verificationStatus: 'verified',
      visitId: visitIdRef.current,
      phone: phoneRef.current,
      step: targetPage,
    })
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('step', targetPage)
      return next
    })
    await loadPage(targetPage, { direct: true })
  }

  const redirectExternal = (rawUrl, reason) => {
    const dest = String(rawUrl || '').trim()
    if (!dest || dest === 'https://' || dest === 'http://') {
      console.warn(`[Priority Chain] ${tag} ${reason} — external URL missing`)
      return false
    }
    const resolved = dest
      .replace(/\{\{msisdn\}\}/gi, phoneRef.current || '')
      .replace(/\{\{phone\}\}/gi, phoneRef.current || '')
      .replace(/\{\{country\}\}/gi, country || '')
      .replace(/\{\{operator\}\}/gi, operator || '')
    console.log(
      `%c[Priority Chain] ${tag} PASS — ${reason} → external ${resolved}`,
      'color:#16a34a;font-weight:bold',
    )
    onOutcome('PASS_EXTERNAL')
    window.location.assign(resolved)
    return true
  }

  const goConfiguredOrContinue = async (action, page, reason, externalUrl = '') => {
    if (action === 'external') {
      return redirectExternal(externalUrl, reason)
    }
    if (action === 'page') {
      const configured = String(page || '').trim().toUpperCase()
      if (VALID_PAGES.includes(configured)) {
        await navigateChainPage(configured, reason)
        return true
      }
      console.warn(`[Priority Chain] ${tag} ${reason} — invalid page:`, page, '→ next step')
    }
    return false
  }

  return { navigateChainPage, redirectExternal, goConfiguredOrContinue }
}
