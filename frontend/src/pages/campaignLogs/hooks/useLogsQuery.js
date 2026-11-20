import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useStore from '../../../store/useStore'
import {
  getLogsStatus,
  searchCampaignLogs,
  getCampaignLogAggregations,
  searchAllCampaignLogs,
  getAllCampaignLogAggregations,
  downloadLogsExport,
} from '../../../services/api/logs'
import { normalizeModeId } from '../../../components/flow/verificationModes'
import { getDateRangeForPreset, formatChartLabel, DEFAULT_TIMEZONE } from '../../../utils/date'
import {
  PAGE_SIZE,
  FLOW_SPECS,
  COMPARE_PRESETS,
  STANDARD_EVENT_TYPES,
  MAX_COMPARE_EVENTS,
  isForeignFlowEvent,
  eventLabel,
  seriesColor,
  resolveInterval,
} from '../logConstants'

export function useLogsQuery() {
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const dateFormat = useStore((s) => s.dateFormat)
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
    if (cachedState?.selectedId != null && cachedState.selectedId !== '') return cachedState.selectedId
    return ''
  })
  const [esEnabled, setEsEnabled] = useState(true)

  const openVisitDetail = useCallback(
    (visitId) => {
      if (!visitId) return
      navigate(`/analytics/visits/${visitId}`)
    },
    [navigate],
  )

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
    } catch {}
  }, [selectedId, datePreset, compareEvents, filters, page])

  const [aggs, setAggs] = useState(null)
  const [logs, setLogs] = useState({ items: [], total: 0, page: 1, size: PAGE_SIZE })
  const [loading, setLoading] = useState(false)
  const [exportingFormat, setExportingFormat] = useState(null)

  const handleExport = useCallback(
    async (format = 'csv') => {
      if (!selectedId || exportingFormat) return
      setExportingFormat(format)
      try {
        const exportParams = { ...filters, timezone, view: 'sessions' }
        if (datePreset === 'all') {
          delete exportParams.from
          delete exportParams.to
        }
        await downloadLogsExport(selectedId, exportParams, format)
        addToast(`Campaign logs exported successfully (${format.toUpperCase()})`, 'success')
      } catch (err) {
        addToast(err.message || 'Failed to export logs', 'error')
      } finally {
        setExportingFormat(null)
      }
    },
    [selectedId, filters, datePreset, timezone, exportingFormat, addToast],
  )

  const chartInterval = resolveInterval(datePreset, filters.from, filters.to)
  const isHourly = chartInterval === 'hour'

  const selectedCampaign = useMemo(() => {
    if (!selectedId || selectedId === 'all') return null
    return campaigns.find((item) => String(item.id) === String(selectedId)) || null
  }, [campaigns, selectedId])

  const flowType = useMemo(() => {
    if (!selectedCampaign) return null
    return normalizeModeId(selectedCampaign.verificationMode)
  }, [selectedCampaign])

  const currentFlowSpec = useMemo(() => {
    if (!flowType) return null
    return FLOW_SPECS[flowType] || null
  }, [flowType])

  const activePresets = useMemo(() => {
    if (currentFlowSpec?.presets) return currentFlowSpec.presets
    return COMPARE_PRESETS
  }, [currentFlowSpec])

  // Synchronize compare events and active filter when switching campaigns/flow
  useEffect(() => {
    if (!currentFlowSpec) return
    const allowed = new Set([...currentFlowSpec.funnelEvents, ...currentFlowSpec.apiEvents])
    const hasInvalid = compareEvents.some((ev) => !allowed.has(ev))
    if (hasInvalid && currentFlowSpec.defaultCompare) {
      setCompareEvents(currentFlowSpec.defaultCompare)
    }
    if (filters.eventType && !allowed.has(filters.eventType)) {
      setFilters((f) => ({ ...f, eventType: '' }))
    }
    if (filters.status && currentFlowSpec.statuses && !currentFlowSpec.statuses.includes(filters.status)) {
      setFilters((f) => ({ ...f, status: '' }))
    }
  }, [currentFlowSpec])

  const getCampaignLabel = useCallback(
    (campaignId) => {
      if (!campaignId) return '—'
      const c = campaigns.find((item) => String(item.id) === String(campaignId))
      if (!c) return `Campaign #${campaignId}`
      return `${c.trackingId || `${c.country} / ${c.operator}`} — ${c.name}`
    },
    [campaigns],
  )

  const getVendorLabel = useCallback(
    (vendorId) => {
      if (!vendorId || vendorId === 'null') return 'Unknown'
      const v = vendors.find((item) => String(item.id) === String(vendorId))
      return v ? `${v.name} (${v.code})` : `Vendor #${vendorId}`
    },
    [vendors],
  )

  useEffect(() => {
    getLogsStatus()
      .then((res) => setEsEnabled(Boolean(res?.enabled)))
      .catch(() => setEsEnabled(false))
    fetchCampaigns()
      .then(() => {
        if (paramCampaignId) {
          setSelectedId(Number(paramCampaignId))
        } else if (cachedState?.selectedId != null && cachedState.selectedId !== '') {
          setSelectedId(cachedState.selectedId)
        } else {
          setSelectedId((prev) => prev || 'all')
        }
      })
      .catch(() => {})
    fetchVendors().catch(() => {})
  }, [addToast, paramCampaignId, cachedState, fetchCampaigns, fetchVendors])

  // Keep Today/Week/Month ranges aligned when profile timezone changes
  useEffect(() => {
    if (datePreset === 'custom' || datePreset === 'all' || !timezone) return
    const range = getDateRangeForPreset(datePreset, timezone)
    setFilters((f) => {
      if (f.from === range.from && f.to === range.to) return f
      return { ...f, from: range.from, to: range.to }
    })
  }, [timezone, datePreset])

  const fetchData = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const interval = resolveInterval(datePreset, filters.from, filters.to)
      const aggParams = {
        ...filters,
        interval,
        timezone,
        compareEvents: compareEvents.join(','),
      }
      const params = { ...filters, page, size: PAGE_SIZE, timezone, view: 'sessions' }
      if (datePreset === 'all') {
        delete aggParams.from
        delete aggParams.to
        delete params.from
        delete params.to
      }
      const isAll = selectedId === 'all'
      const [aggRes, logRes] = await Promise.all([
        isAll ? getAllCampaignLogAggregations(aggParams) : getCampaignLogAggregations(selectedId, aggParams),
        isAll ? searchAllCampaignLogs(params) : searchCampaignLogs(selectedId, params),
      ])
      setAggs(aggRes)
      setLogs(logRes)
    } catch (err) {
      addToast(err.message || 'Failed to load logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedId, filters, page, addToast, datePreset, timezone, compareEvents])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalEvents = useMemo(
    () => (aggs?.byEventType || []).reduce((sum, b) => sum + b.count, 0),
    [aggs],
  )

  const otpStats = aggs?.otpStats || {
    requested: 0,
    verifiedLive: 0,
    verifiedVendor: 0,
    held: 0,
    liveConvPercent: 0,
    vendorConvPercent: 0,
    holdPercent: 0,
  }

  const eventTypeOptions = useMemo(() => {
    if (currentFlowSpec) {
      const allowed = new Set([...currentFlowSpec.funnelEvents, ...currentFlowSpec.apiEvents])
      if (aggs?.byEventType) {
        aggs.byEventType.forEach((item) => {
          if (item.key && !isForeignFlowEvent(item.key, flowType)) {
            allowed.add(item.key)
          }
        })
      }
      if (filters.eventType) {
        allowed.add(filters.eventType)
      }
      return Array.from(allowed)
    }

    const set = new Set(STANDARD_EVENT_TYPES)
    if (aggs?.byEventType) {
      aggs.byEventType.forEach((item) => {
        if (item.key) set.add(item.key)
      })
    }
    if (filters.eventType && !set.has(filters.eventType)) {
      set.add(filters.eventType)
    }
    return Array.from(set).sort()
  }, [aggs, filters.eventType, currentFlowSpec, flowType])

  const statusOptions = useMemo(() => {
    if (currentFlowSpec?.statuses) {
      const set = new Set(currentFlowSpec.statuses)
      if (aggs?.byStatus) {
        aggs.byStatus.forEach((item) => {
          if (item.key && item.count > 0) set.add(item.key)
        })
      }
      if (filters.status && !set.has(filters.status)) {
        set.add(filters.status)
      }
      return Array.from(set)
    }
    const defaultStatuses = [
      'VISIT',
      'HOME_SHOWN',
      'CONFIRM_SHOWN',
      'OTP_SHOWN',
      'SUBSCRIBED',
      'SUCCESS',
      'FAILED',
      'BLOCKED',
      'ACTIVE',
      'PENDING',
    ]
    const set = new Set(defaultStatuses)
    if (aggs?.byStatus) {
      aggs.byStatus.forEach((item) => {
        if (item.key && item.count > 0) set.add(item.key)
      })
    }
    if (filters.status && !set.has(filters.status)) {
      set.add(filters.status)
    }
    return Array.from(set)
  }, [currentFlowSpec, aggs, filters.status])

  const [chartEventCategory, setChartEventCategory] = useState('funnel')

  const eventsByTypeData = useMemo(() => {
    const raw = aggs?.byEventType || []
    if (!currentFlowSpec) return raw

    if (chartEventCategory === 'funnel') {
      const funnelSet = new Set(currentFlowSpec.funnelEvents)
      return raw.filter((item) => funnelSet.has(item.key) && item.count > 0)
    }

    const allowed = new Set([...currentFlowSpec.funnelEvents, ...currentFlowSpec.apiEvents])
    return raw.filter(
      (item) => (allowed.has(item.key) || !isForeignFlowEvent(item.key, flowType)) && item.count > 0,
    )
  }, [aggs, currentFlowSpec, flowType, chartEventCategory])

  const statusDistributionData = useMemo(() => {
    const raw = aggs?.byStatus || []
    if (!currentFlowSpec) return raw.filter((item) => item.count > 0)
    const allowed = new Set(currentFlowSpec.statuses)
    return raw.filter((item) => allowed.has(item.key) && item.count > 0)
  }, [aggs, currentFlowSpec])

  const totalPages = Math.max(1, Math.ceil((logs.total || 0) / PAGE_SIZE))

  const timeSeriesData = useMemo(() => {
    const series = aggs?.timeSeries || []
    return series.map((row) => ({
      ...row,
      label: formatChartLabel(row.key, { hourly: isHourly }),
    }))
  }, [aggs, isHourly, dateFormat, timezone])

  const funnelCompareData = useMemo(() => {
    const series = aggs?.timeSeriesByEvent || []
    return series.map((row) => ({
      ...row,
      label: formatChartLabel(row.key, { hourly: isHourly }),
    }))
  }, [aggs, isHourly, dateFormat, timezone])

  const selectedSeries = useMemo(
    () =>
      compareEvents.map((key, index) => ({
        key,
        label: eventLabel(key),
        color: seriesColor(index),
      })),
    [compareEvents],
  )

  const funnelTotals = aggs?.funnelTotals || {}
  const funnelBarData = selectedSeries.map((s) => ({
    key: s.label,
    count: Number(funnelTotals[s.key]) || 0,
    fill: s.color,
  }))
  const firstCount = Number(funnelTotals[compareEvents[0]]) || 0
  const lastCount = Number(funnelTotals[compareEvents[compareEvents.length - 1]]) || 0
  const compareRatio =
    compareEvents.length >= 2 && firstCount > 0
      ? `${((lastCount / firstCount) * 100).toFixed(1)}%`
      : '—'
  const compareRatioHint =
    compareEvents.length >= 2
      ? `${eventLabel(compareEvents[compareEvents.length - 1])} ÷ ${eventLabel(compareEvents[0])}`
      : 'Pick 2 events'

  const toggleCompareEvent = (type) => {
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
  }

  const updateFilter = (key, value) => {
    setPage(1)
    if (key === 'from' || key === 'to') setDatePreset('custom')
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') return
    const range = getDateRangeForPreset(preset, timezone)
    setFilters((f) => ({ ...f, from: range.from, to: range.to }))
  }

  return {
    campaigns,
    vendors,
    selectedId,
    setSelectedId,
    esEnabled,
    datePreset,
    compareEvents,
    setCompareEvents,
    filters,
    page,
    setPage,
    aggs,
    logs,
    loading,
    exportingFormat,
    handleExport,
    fetchData,
    openVisitDetail,
    isHourly,
    timezone,
    currentFlowSpec,
    flowType,
    activePresets,
    selectedSeries,
    funnelTotals,
    funnelBarData,
    funnelCompareData,
    compareRatio,
    compareRatioHint,
    toggleCompareEvent,
    totalEvents,
    otpStats,
    eventTypeOptions,
    statusOptions,
    chartEventCategory,
    setChartEventCategory,
    eventsByTypeData,
    statusDistributionData,
    totalPages,
    timeSeriesData,
    getCampaignLabel,
    getVendorLabel,
    updateFilter,
    applyDatePreset,
  }
}
