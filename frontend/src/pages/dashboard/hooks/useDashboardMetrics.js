import { useState, useEffect, useCallback, useMemo } from 'react'
import useStore from '../../../store/useStore'
import { listMarkets } from '../../../services/api/markets'
import { listCampaigns } from '../../../services/api/campaigns'
import { listVendors, getPostbackSummary } from '../../../services/api/partners'
import { searchAllCampaignLogs } from '../../../services/api/logs'
import { getDateRangeForPreset, DEFAULT_TIMEZONE, shiftDateString, formatChartLabel } from '../../../utils/date'
import { FUNNEL_FROM_STATS } from '../dashboardConstants'

export function useDashboardMetrics() {
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const addToast = useStore((s) => s.addToast)

  const [preset, setPreset] = useState('today')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [dateRange, setDateRange] = useState(() => getDateRangeForPreset('today', timezone))

  // Country / Operator / Campaign Filter State
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [markets, setMarkets] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [vendors, setVendors] = useState([])
  const [postbackStats, setPostbackStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])

  // Available countries derived from markets and campaigns
  const availableCountries = useMemo(() => {
    const map = new Map()
    markets.forEach((m) => {
      const code = String(m.countryCode || '').trim().toUpperCase()
      if (code && !map.has(code)) {
        map.set(code, { code, name: m.countryName || code })
      }
    })
    campaigns.forEach((c) => {
      const code = String(c.countryCode || c.country || '').trim().toUpperCase()
      if (code && !map.has(code)) {
        map.set(code, { code, name: code })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [markets, campaigns])

  // Available operators scoped by selectedCountry
  const availableOperators = useMemo(() => {
    const map = new Map()
    const targetCountry = selectedCountry ? selectedCountry.toUpperCase() : null

    markets.forEach((m) => {
      const cCode = String(m.countryCode || '').trim().toUpperCase()
      if (targetCountry && cCode !== targetCountry) return
      const opCode = String(m.operatorCode || '').trim().toLowerCase()
      if (opCode && !map.has(opCode)) {
        map.set(opCode, { code: opCode, name: m.operatorName || opCode.toUpperCase() })
      }
    })

    campaigns.forEach((c) => {
      const cCode = String(c.countryCode || c.country || '').trim().toUpperCase()
      if (targetCountry && cCode !== targetCountry) return
      const opCode = String(c.operatorCode || c.operator || '').trim().toLowerCase()
      if (opCode && !map.has(opCode)) {
        map.set(opCode, { code: opCode, name: (c.operator || opCode).toUpperCase() })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [markets, campaigns, selectedCountry])

  // Available campaigns scoped by selectedCountry and selectedOperator
  const availableCampaigns = useMemo(() => {
    const targetCountry = selectedCountry ? selectedCountry.toUpperCase() : null
    const targetOp = selectedOperator ? selectedOperator.toLowerCase() : null

    return campaigns.filter((c) => {
      if (targetCountry) {
        const cCode = String(c.countryCode || c.country || '').trim().toUpperCase()
        if (cCode !== targetCountry) return false
      }
      if (targetOp) {
        const opCode = String(c.operatorCode || c.operator || '').trim().toLowerCase()
        if (opCode !== targetOp) return false
      }
      return true
    })
  }, [campaigns, selectedCountry, selectedOperator])

  // Cascading Filter Handlers
  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode)
    if (selectedOperator) {
      const targetCountry = countryCode ? countryCode.toUpperCase() : null
      const opStillValid =
        markets.some((m) => {
          const cMatch = !targetCountry || String(m.countryCode || '').trim().toUpperCase() === targetCountry
          return cMatch && String(m.operatorCode || '').trim().toLowerCase() === selectedOperator.toLowerCase()
        }) ||
        campaigns.some((c) => {
          const cCode = String(c.countryCode || c.country || '').trim().toUpperCase()
          const cMatch = !targetCountry || cCode === targetCountry
          return cMatch && String(c.operatorCode || c.operator || '').trim().toLowerCase() === selectedOperator.toLowerCase()
        })
      if (!opStillValid) {
        setSelectedOperator('')
        setSelectedCampaignId('')
        return
      }
    }
    if (selectedCampaignId) {
      const campStillValid = campaigns.some((c) => {
        if (String(c.id) !== String(selectedCampaignId)) return false
        if (!countryCode) return true
        const cCode = String(c.countryCode || c.country || '').trim().toUpperCase()
        return cCode === countryCode.toUpperCase()
      })
      if (!campStillValid) {
        setSelectedCampaignId('')
      }
    }
  }

  const handleOperatorChange = (opCode) => {
    setSelectedOperator(opCode)
    if (selectedCampaignId) {
      const campStillValid = campaigns.some((c) => {
        if (String(c.id) !== String(selectedCampaignId)) return false
        if (!opCode) return true
        const cOp = String(c.operatorCode || c.operator || '').trim().toLowerCase()
        return cOp === opCode.toLowerCase()
      })
      if (!campStillValid) {
        setSelectedCampaignId('')
      }
    }
  }

  const handleClearFilters = () => {
    setSelectedCountry('')
    setSelectedOperator('')
    setSelectedCampaignId('')
  }

  // Resolve preset change
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset)
    if (newPreset === 'yesterday') {
      const todayStr = getDateRangeForPreset('today', timezone).from
      const yestStr = shiftDateString(todayStr, -1)
      setDateRange({ from: yestStr, to: yestStr })
    } else if (newPreset !== 'custom') {
      const range = getDateRangeForPreset(newPreset, timezone)
      setDateRange(range)
    }
  }

  const handleCustomDateApply = () => {
    if (!customRange.from || !customRange.to) {
      addToast('Please select both From and To dates', 'warning')
      return
    }
    setDateRange({ from: customRange.from, to: customRange.to })
  }

  const fetchDashboardData = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) setRefreshing(true)
      else setLoading(true)

      try {
        const params = {
          from: dateRange.from,
          to: dateRange.to,
          timezone,
          country: selectedCountry || undefined,
          operator: selectedOperator || undefined,
          campaignId: selectedCampaignId || undefined,
        }

        const [marketsRes, campaignsRes, vendorsRes, postbackRes, logsRes] =
          await Promise.allSettled([
            listMarkets(),
            listCampaigns(),
            listVendors(),
            getPostbackSummary(params),
            searchAllCampaignLogs({ ...params, page: 1, size: 10, view: 'sessions' }),
          ])

        if (marketsRes.status === 'fulfilled') setMarkets(marketsRes.value || [])
        if (campaignsRes.status === 'fulfilled') setCampaigns(campaignsRes.value || [])
        if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value || [])
        if (postbackRes.status === 'fulfilled') setPostbackStats(postbackRes.value || null)
        if (logsRes.status === 'fulfilled') setRecentLogs(logsRes.value?.items || [])
      } catch (err) {
        console.error('Dashboard data fetch error:', err)
        addToast('Failed to load dashboard statistics', 'error')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [dateRange, timezone, selectedCountry, selectedOperator, selectedCampaignId, addToast],
  )

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      if (active) fetchDashboardData()
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fetchDashboardData])

  const totalVisits = Number(postbackStats?.visits) || 0
  const totalConversions =
    postbackStats?.conversions != null
      ? Number(postbackStats.conversions) || 0
      : Number(postbackStats?.subscribeSuccess) || 0

  const conversionRate = useMemo(() => {
    if (!totalVisits) return '0.0%'
    return `${((totalConversions / totalVisits) * 100).toFixed(1)}%`
  }, [totalVisits, totalConversions])

  const filteredCampaigns = useMemo(() => {
    return availableCampaigns.filter((c) => {
      if (selectedCampaignId) return String(c.id) === String(selectedCampaignId)
      return true
    })
  }, [availableCampaigns, selectedCampaignId])

  const activeCampaignsCount = useMemo(() => {
    return filteredCampaigns.filter((c) => c.active).length
  }, [filteredCampaigns])

  const filteredMarketsCount = useMemo(() => {
    if (!selectedCountry && !selectedOperator) return markets.length
    return markets.filter((m) => {
      if (selectedCountry && String(m.countryCode || '').trim().toUpperCase() !== selectedCountry.toUpperCase()) return false
      if (selectedOperator && String(m.operatorCode || '').trim().toLowerCase() !== selectedOperator.toLowerCase()) return false
      return true
    }).length
  }, [markets, selectedCountry, selectedOperator])

  const totalPostbacks = useMemo(() => {
    return postbackStats?.postbacksCreated || postbackStats?.total || 0
  }, [postbackStats])

  const operatorStatusBreakdown = useMemo(() => {
    return postbackStats?.byOperatorStatus || []
  }, [postbackStats])

  const callbacksReceived = useMemo(() => {
    if (postbackStats?.callbacksReceived != null) return postbackStats.callbacksReceived
    return operatorStatusBreakdown.reduce((n, row) => n + (Number(row.count) || 0), 0)
  }, [postbackStats, operatorStatusBreakdown])

  const vendorQualityList = useMemo(() => {
    return postbackStats?.vendorQuality || []
  }, [postbackStats])

  const funnelBreakdown = useMemo(() => {
    return FUNNEL_FROM_STATS
      .map((item) => ({
        ...item,
        count: Number(postbackStats?.[item.field]) || 0,
      }))
      .filter((item) => item.count > 0 || item.key === 'VISIT')
  }, [postbackStats])

  const timeSeriesData = useMemo(() => {
    return (postbackStats?.byDate || []).map((item) => ({
      rawKey: item.statDate,
      label: formatChartLabel(item.statDate, { hourly: false }),
      Visits: item.visits || 0,
    }))
  }, [postbackStats])

  // Helper URL builder for Analytics page navigation
  const buildAnalyticsUrl = useCallback(
    (extraParams = {}) => {
      const search = new URLSearchParams()
      search.set('preset', preset)
      if (dateRange.from) search.set('from', dateRange.from)
      if (dateRange.to) search.set('to', dateRange.to)
      if (selectedCountry) search.set('country', selectedCountry)
      if (selectedOperator) search.set('operator', selectedOperator)
      if (selectedCampaignId) search.set('campaignId', selectedCampaignId)
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          search.set(k, String(v))
        }
      })
      return `/analytics?${search.toString()}`
    },
    [preset, dateRange, selectedCountry, selectedOperator, selectedCampaignId],
  )

  return {
    timezone,
    preset,
    customRange,
    setCustomRange,
    dateRange,
    selectedCountry,
    selectedOperator,
    selectedCampaignId,
    setSelectedCampaignId,
    loading,
    refreshing,
    markets,
    campaigns,
    vendors,
    postbackStats,
    recentLogs,
    availableCountries,
    availableOperators,
    availableCampaigns,
    handleCountryChange,
    handleOperatorChange,
    handleClearFilters,
    handlePresetChange,
    handleCustomDateApply,
    fetchDashboardData,
    totalVisits,
    totalConversions,
    conversionRate,
    filteredCampaigns,
    activeCampaignsCount,
    filteredMarketsCount,
    totalPostbacks,
    operatorStatusBreakdown,
    callbacksReceived,
    vendorQualityList,
    funnelBreakdown,
    timeSeriesData,
    buildAnalyticsUrl,
  }
}
