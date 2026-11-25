import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { DEFAULT_TIMEZONE } from '../../../utils/date'
import {
  PAGE_SIZE,
  FLOW_SPECS,
  COMPARE_PRESETS,
  resolveInterval,
} from '../logConstants'
import { useLogsChartData } from './useLogsChartData'
import { useLogsFilterState } from './useLogsFilterState'

export function useLogsQuery() {
  const navigate = useNavigate()
  const addToast = useStore((s) => s.addToast)
  const campaigns = useStore((s) => s.campaigns)
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const vendors = useStore((s) => s.vendors)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const dateFormat = useStore((s) => s.dateFormat)

  const [esEnabled, setEsEnabled] = useState(true)

  const openVisitDetail = useCallback(
    (visitId) => {
      if (!visitId) return
      navigate(`/analytics/visits/${visitId}`)
    },
    [navigate],
  )

  const [chartEventCategory, setChartEventCategory] = useState('funnel')
  const [aggs, setAggs] = useState(null)
  const [logs, setLogs] = useState({ items: [], total: 0, page: 1, size: PAGE_SIZE })
  const [loading, setLoading] = useState(false)
  const [exportingFormat, setExportingFormat] = useState(null)

  // Derive campaign flow specs for filters
  const selectedCampaignPre = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('tc_campaign_logs_filter_state')
      const cachedId = raw ? JSON.parse(raw)?.selectedId : ''
      return campaigns.find((item) => String(item.id) === String(cachedId)) || null
    } catch {
      return null
    }
  }, [campaigns])

  const flowTypePre = useMemo(() => {
    if (!selectedCampaignPre) return null
    return normalizeModeId(selectedCampaignPre.verificationMode)
  }, [selectedCampaignPre])

  const currentFlowSpecPre = useMemo(() => {
    if (!flowTypePre) return null
    return FLOW_SPECS[flowTypePre] || null
  }, [flowTypePre])

  const {
    cachedState,
    paramCampaignId,
    selectedId,
    setSelectedId,
    datePreset,
    compareEvents,
    setCompareEvents,
    filters,
    page,
    setPage,
    toggleCompareEvent,
    updateFilter,
    applyDatePreset,
  } = useLogsFilterState({
    timezone,
    currentFlowSpec: currentFlowSpecPre,
    addToast,
  })

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

  const chartInterval = resolveInterval(datePreset, filters.from, filters.to)
  const isHourly = chartInterval === 'hour'

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
  }, [addToast, paramCampaignId, cachedState, fetchCampaigns, fetchVendors, setSelectedId])

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
    let active = true
    const timer = setTimeout(() => {
      if (active) fetchData()
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fetchData])

  const chartData = useLogsChartData({
    aggs,
    currentFlowSpec,
    flowType,
    chartEventCategory,
    compareEvents,
    filters,
    isHourly,
    dateFormat,
    timezone,
  })

  const totalPages = Math.max(1, Math.ceil((logs.total || 0) / PAGE_SIZE))

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
    selectedSeries: chartData.selectedSeries,
    funnelTotals: chartData.funnelTotals,
    funnelBarData: chartData.funnelBarData,
    funnelCompareData: chartData.funnelCompareData,
    compareRatio: chartData.compareRatio,
    compareRatioHint: chartData.compareRatioHint,
    toggleCompareEvent,
    totalEvents: chartData.totalEvents,
    otpStats: chartData.otpStats,
    eventTypeOptions: chartData.eventTypeOptions,
    statusOptions: chartData.statusOptions,
    chartEventCategory,
    setChartEventCategory,
    eventsByTypeData: chartData.eventsByTypeData,
    statusDistributionData: chartData.statusDistributionData,
    totalPages,
    timeSeriesData: chartData.timeSeriesData,
    getCampaignLabel,
    getVendorLabel,
    updateFilter,
    applyDatePreset,
  }
}
