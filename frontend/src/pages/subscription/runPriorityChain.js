import { transitionFlow } from '../../services/api/flow'
import { VALID_PAGES } from './constants'
import { processPriorityApiStep } from './priority/priorityApiStep'

async function runPriorityChain({
  actions,
  node,
  shadow,
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
  cachePage,
  setError,
}) {
  console.groupCollapsed(
    `%c[Priority Chain] START — ${actions.length} step(s)`,
    'color:#6366f1;font-weight:bold',
  )
  console.log('Button label:', (node.textContent || '').trim().slice(0, 80) || '(no label)')
  console.table(
    actions.map((s, idx) => ({
      priority: idx + 1,
      type: s.type,
      url: s.url || '',
      page: s.page || '',
      section: s.section || '',
    })),
  )

  let chainOutcome = 'NO_MATCH'
  const setChainOutcome = (val) => {
    chainOutcome = val
  }

  try {
    for (let i = 0; i < actions.length; i++) {
      const step = actions[i]
      const tag = `Priority ${i + 1} (${step.type})`

      if (step.type === 'api') {
        const result = await processPriorityApiStep({
          step,
          index: i,
          totalSteps: actions.length,
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
          onOutcome: setChainOutcome,
        })
        if (result?.handled) break
      } else if (step.type === 'page') {
        const targetPage = (step.page || '').toUpperCase()
        if (VALID_PAGES.includes(targetPage)) {
          console.log(
            `%c[Priority Chain] ${tag} PASS — navigate to ${targetPage}`,
            'color:#16a34a;font-weight:bold',
          )
          chainOutcome = `PASS_PAGE_${targetPage}`
          if (targetPage === 'THANKYOU' || targetPage === 'CONFIRM') {
            saveSession({
              verificationStatus: 'verified',
              visitId: visitIdRef.current,
              phone: phoneRef.current,
              step: targetPage,
            })
          }
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('step', targetPage)
            return next
          })
          await loadPage(targetPage, { direct: true })
          break
        }
        console.error(`[Priority Chain] ${tag} FAIL — invalid page:`, step.page)
      } else if (step.type === 'flow') {
        console.log(
          `%c[Priority Chain] ${tag} PASS — continue HE / OTP verification flow`,
          'color:#16a34a;font-weight:bold',
        )
        chainOutcome = 'PASS_FLOW'
        const fromPage = pageDataRef.current?.pageType
        const next = await transitionFlow({
          visitId: visitIdRef.current,
          country,
          operator,
          fromPage: fromPage || 'HOME',
          action: 'SUBSCRIBE',
          phone: phoneRef.current,
        })
        cachePage(next)
        break
      } else if (step.type === 'anchor') {
        const targetId = step.section
        if (targetId) {
          const targetEl = shadow.getElementById(targetId)
          if (targetEl) {
            console.log(
              `%c[Priority Chain] ${tag} PASS — scroll to #${targetId}`,
              'color:#16a34a;font-weight:bold',
            )
            chainOutcome = `PASS_ANCHOR_${targetId}`
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
            console.warn(`[Priority Chain] ${tag} FAIL — section #${targetId} not found`)
          }
        } else {
          console.warn(`[Priority Chain] ${tag} FAIL — no section id`)
        }
      } else if (step.type === 'external') {
        if (step.url) {
          console.log(
            `%c[Priority Chain] ${tag} PASS — redirect to ${step.url}`,
            'color:#16a34a;font-weight:bold',
          )
          chainOutcome = 'PASS_EXTERNAL'
          window.open(step.url, node.getAttribute('target') || '_self')
        } else {
          console.error(`[Priority Chain] ${tag} FAIL — external URL missing`)
        }
        break
      } else {
        console.warn(`[Priority Chain] ${tag} SKIP — unknown type:`, step.type)
      }
    }

    if (chainOutcome === 'NO_MATCH') {
      console.warn('[Priority Chain] END — no step completed navigation (all API checks failed / skipped)')
    } else {
      console.log(
        `%c[Priority Chain] END — ${chainOutcome}`,
        'color:#16a34a;font-weight:bold',
      )
    }
  } catch (err) {
    console.error('%c[Priority Chain] FAIL — chain aborted', 'color:#dc2626;font-weight:bold', err)
    setError(err.message || 'Action chain execution failed')
  } finally {
    console.groupEnd()
  }
}

export { runPriorityChain }
