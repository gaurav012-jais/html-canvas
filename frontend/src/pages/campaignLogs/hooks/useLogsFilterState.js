import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getDateRangeForPreset } from '../../../utils/date'
import { MAX_COMPARE_EVENTS } from '../logConstants'

export function useLogsFilterState({ timezone, currentFlowSpec, addToast }) {
  const [searchParams] = useSearchParams()
  const paramCampaignId = searchParams.get('campaignId')
  const paramPreset = searchParams.get('preset')
  const paramFrom = searchParams.get('from')
  const paramTo = searchParams.get('to')
  const paramEventType = searchParams.get('eventType')
  const paramVendorId = searchParams.get('vendorId')

  const cachedState = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('tc_campaign_logs_filter_state')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const [selectedId, setSelectedId] = useState(() => {
    if (paramCampaignId) return Number(paramCampaignId)
    if (cachedState?.selectedId != null && cachedState.selectedId !== '') {
      return cachedState.selectedId
    }
    return ''
  })

  const [datePreset, setDatePreset] = useState(() => {
    if (paramPreset) return paramPreset
    if (paramFrom && paramTo) return 'custom'
    if (cachedState?.datePreset) return cachedState.datePreset
    return 'today'
  })

  const [compareEvents, setCompareEvents] = useState(() => {
    if (
      cachedState?.compareEvents &&
      Array.isArray(cachedState.compareEvents) &&
      cachedState.compareEvents.length > 0
    ) {
      return cachedState.compareEvents
    }
    return ['VISIT', 'CONFIRM_VIEW', 'OTP_VERIFY', 'SUBSCRIBE_SUCCESS']
  })

  const [filters, setFilters] = useState(() => {
    const hasParam = paramPreset || paramFrom || paramTo || paramEventType || paramVendorId
    if (hasParam) {
      const range = getDateRangeForPreset(paramPreset || 'today', timezone)
      return {
        eventType: paramEventType || '',
        status: '',
        vendorId: paramVendorId || '',
        clickId: '',
        q: '',
        from: paramFrom || range.from,
        to: paramTo || range.to,
      }
    }
    if (cachedState?.filters) {
      return cachedState.filters
    }
    const range = getDateRangeForPreset('today', timezone)
    return {
      eventType: '',
      status: '',
      vendorId: '',
      clickId: '',
      q: '',
      from: range.from,
      to: range.to,
    }
  })

  const [page, setPage] = useState(() => {
    if (cachedState?.page && Number(cachedState.page) > 0) {
      return Number(cachedState.page)
    }
    return 1
  })

  // Persist filter state across visit detail view & navigation
  useEffect(() => {
    if (!selectedId) return
    try {
      sessionStorage.setItem(
        'tc_campaign_logs_filter_state',
        JSON.stringify({
          selectedId,
          datePreset,
          compareEvents,
          filters,
          page,
        }),
      )
    } catch {
      // ignore storage failure
    }
  }, [selectedId, datePreset, compareEvents, filters, page])

  // Synchronize compare events and active filter when switching campaigns/flow
  useEffect(() => {
    if (!currentFlowSpec) return
    const allowed = new Set([...currentFlowSpec.funnelEvents, ...currentFlowSpec.apiEvents])
    const hasInvalid = compareEvents.some((ev) => !allowed.has(ev))
    const timer = setTimeout(() => {
      if (hasInvalid && currentFlowSpec.defaultCompare) {
        setCompareEvents(currentFlowSpec.defaultCompare)
      }
      if (filters.eventType && !allowed.has(filters.eventType)) {
        setFilters((f) => ({ ...f, eventType: '' }))
      }
      if (
        filters.status &&
        currentFlowSpec.statuses &&
        !currentFlowSpec.statuses.includes(filters.status)
      ) {
        setFilters((f) => ({ ...f, status: '' }))
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [currentFlowSpec, compareEvents, filters.eventType, filters.status])

  useEffect(() => {
    if (datePreset === 'custom' || datePreset === 'all' || !timezone) return
    const range = getDateRangeForPreset(datePreset, timezone)
    const timer = setTimeout(() => {
      setFilters((f) => {
        if (f.from === range.from && f.to === range.to) return f
        return { ...f, from: range.from, to: range.to }
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [timezone, datePreset])

  const toggleCompareEvent = useCallback(
    (type) => {
      setCompareEvents((prev) => {
        if (prev.includes(type)) {
          if (prev.length <= 1) return prev
          return prev.filter((key) => key !== type)
        }
        if (prev.length >= MAX_COMPARE_EVENTS) {
          addToast(`Pick up to ${MAX_COMPARE_EVENTS} events`, 'warning')
          return prev
        }
        return [...prev, type]
      })
    },
    [addToast],
  )

  const updateFilter = useCallback((key, value) => {
    setPage(1)
    if (key === 'from' || key === 'to') setDatePreset('custom')
    setFilters((f) => ({ ...f, [key]: value }))
  }, [])

  const applyDatePreset = useCallback(
    (preset) => {
      setDatePreset(preset)
      setPage(1)
      if (preset === 'custom') return
      const range = getDateRangeForPreset(preset, timezone)
      setFilters((f) => ({ ...f, from: range.from, to: range.to }))
    },
    [timezone],
  )

  return {
    cachedState,
    paramCampaignId,
    selectedId,
    setSelectedId,
    datePreset,
    setDatePreset,
    compareEvents,
    setCompareEvents,
    filters,
    setFilters,
    page,
    setPage,
    toggleCompareEvent,
    updateFilter,
    applyDatePreset,
  }
}
