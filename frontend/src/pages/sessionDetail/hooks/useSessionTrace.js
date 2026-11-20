import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVisitDetail } from '../../../services/api/logs'
import { categorizeTimelineItem } from '../sessionDetailHelpers'

export function useSessionTrace() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)
  const [viewMode, setViewMode] = useState('flow') // 'flow' | 'timeline'

  const load = useCallback(async () => {
    if (!visitId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getVisitDetail(visitId)
      setDetail(data)
    } catch (err) {
      setError(err.message || 'Failed to load session detail')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [visitId])

  useEffect(() => {
    load()
  }, [load])

  const visit = detail?.visit
  const apiById = useMemo(() => {
    const map = new Map()
    for (const c of detail?.apiCalls || []) map.set(c.id, c)
    return map
  }, [detail?.apiCalls])

  const flowSteps = useMemo(() => {
    const rawTimeline = detail?.timeline || []
    const groups = [
      {
        stepIndex: 1,
        stepKey: 'LANDING',
        stepTitle: 'Step 1: Landing & Identity Check',
        badge: 'HOME',
        badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
        description:
          'Visitor arrival, Header Enrichment (HE), MSISDN resolution, or subscriber status check.',
        items: [],
      },
      {
        stepIndex: 2,
        stepKey: 'PLAN_SELECTION',
        stepTitle: 'Step 2: User Action & Funnel Transition',
        badge: 'CONFIRM / STEP 2',
        badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        description:
          'User clicked subscribe/continue, pack selected, or Priority Chain routed.',
        items: [],
      },
      {
        stepIndex: 3,
        stepKey: 'VERIFICATION',
        stepTitle: 'Step 3: OTP / PIN Verification & Billing Auth',
        badge: 'OTP',
        badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
        description:
          'OTP generation, SMS delivery, PIN submission, and partner verification.',
        items: [],
      },
      {
        stepIndex: 4,
        stepKey: 'OUTCOME',
        stepTitle: 'Step 4: Activation, Billing & Postback',
        badge: 'COMPLETION',
        badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        description:
          'Subscription status confirmed, carrier billing callback, and vendor CPA postback.',
        items: [],
      },
    ]

    for (const item of rawTimeline) {
      const apiCall = item.kind === 'api' ? apiById.get(item.apiCallId) : null
      const { stepIndex } = categorizeTimelineItem(item, apiCall)
      const group = groups[stepIndex - 1]
      if (group) group.items.push(item)
    }

    return groups.filter((g) => g.items.length > 0)
  }, [detail?.timeline, apiById])

  return {
    visitId,
    navigate,
    loading,
    error,
    detail,
    visit,
    apiById,
    flowSteps,
    viewMode,
    setViewMode,
    load,
  }
}
