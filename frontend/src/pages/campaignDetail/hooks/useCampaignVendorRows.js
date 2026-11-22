import { useState, useEffect, useMemo, useCallback } from 'react'
import { getCampaignVendorStats } from '../../../services/api/campaigns'
import { getDateRangeForPreset, shiftDateString } from '../../../utils/date'
import { effectiveCallbackStatuses } from '../../../components/partners/AllowedCallbackStatusesField'

export function useCampaignVendorRows({ id, campaign, vendors, timezone, addToast }) {
  const [vendorPreset, setVendorPreset] = useState('today')
  const [vendorCustomRange, setVendorCustomRange] = useState({ from: '', to: '' })
  const [vendorDateRange, setVendorDateRange] = useState(() => getDateRangeForPreset('today', timezone))
  const [vendorStats, setVendorStats] = useState({ apiExpose: false, vendors: [] })
  const [vendorStatsLoading, setVendorStatsLoading] = useState(false)

  const handleVendorPresetChange = useCallback((newPreset) => {
    setVendorPreset(newPreset)
    if (newPreset === 'all') {
      setVendorDateRange({ from: '', to: '' })
    } else if (newPreset === 'yesterday') {
      const todayStr = getDateRangeForPreset('today', timezone).from
      const yestStr = shiftDateString(todayStr, -1)
      setVendorDateRange({ from: yestStr, to: yestStr })
    } else if (newPreset !== 'custom') {
      const range = getDateRangeForPreset(newPreset, timezone)
      setVendorDateRange(range)
    }
  }, [timezone])

  const handleVendorCustomDateApply = useCallback(() => {
    if (!vendorCustomRange.from || !vendorCustomRange.to) {
      if (addToast) addToast('Please select both From and To dates', 'warning')
      return
    }
    setVendorDateRange({ from: vendorCustomRange.from, to: vendorCustomRange.to })
  }, [vendorCustomRange, addToast])

  const loadVendorStats = useCallback(() => {
    if (!id) return
    setVendorStatsLoading(true)
    getCampaignVendorStats(id, {
      from: vendorDateRange.from,
      to: vendorDateRange.to,
      timezone,
    })
      .then((data) => {
        setVendorStats(data || { apiExpose: false, vendors: [] })
      })
      .catch((err) => {
        console.error('Failed to load vendor stats:', err)
        setVendorStats({ apiExpose: false, vendors: [] })
      })
      .finally(() => {
        setVendorStatsLoading(false)
      })
  }, [id, vendorDateRange, timezone])

  useEffect(() => {
    let cancelled = false
    if (!id) return
    const timer = setTimeout(() => {
      setVendorStatsLoading(true)
      getCampaignVendorStats(id, {
        from: vendorDateRange.from,
        to: vendorDateRange.to,
        timezone,
      })
        .then((data) => {
          if (!cancelled) setVendorStats(data || { apiExpose: false, vendors: [] })
        })
        .catch((err) => {
          console.error('Failed to fetch vendor stats:', err)
          if (!cancelled) setVendorStats({ apiExpose: false, vendors: [] })
        })
        .finally(() => {
          if (!cancelled) setVendorStatsLoading(false)
        })
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, vendorDateRange.from, vendorDateRange.to, timezone, campaign?.trackings])

  const activeVendors = useMemo(
    () => vendors.filter((v) => v.active !== false),
    [vendors],
  )

  const vendorTrackings = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const t of campaign?.trackings || []) {
      const tid = Number(t.vendor?.id ?? t.vendorId)
      if (!tid || seen.has(tid)) continue
      seen.add(tid)
      list.push({
        ...t,
        vendor: t.vendor || vendors.find((v) => Number(v.id) === tid) || { id: tid },
      })
    }
    return list
  }, [campaign?.trackings, vendors])

  const vendorRows = useMemo(() => {
    const byId = new Map(
      (vendorStats.vendors || []).map((row) => [Number(row.vendorId), row]),
    )
    const rows = vendorTrackings.map((t) => {
      const vendorId = Number(t.vendor?.id ?? t.vendorId)
      const vendor = t.vendor || {}
      const stats = byId.get(vendorId)
      byId.delete(vendorId)
      return {
        vendorId,
        vendorName: stats?.vendorName || vendor.name || `Vendor #${vendorId}`,
        vendorCode: stats?.vendorCode || vendor.code || null,
        fireStatuses: effectiveCallbackStatuses(
          t.allowedCallbackStatuses,
          vendor,
        ),
        assignmentActive: t.active !== false,
        payoutPercent: Number(stats?.payoutPercent ?? t.payoutPercent ?? 100),
        totalClicks: stats?.totalClicks ?? 0,
        requestedApi: stats?.requestedApi ?? 0,
        verifiedApi: stats?.verifiedApi ?? 0,
        failedApi: stats?.failedApi ?? 0,
        failedVerify: stats?.failedVerify ?? stats?.pinValFailed ?? 0,
        failedSend: stats?.failedSend ?? 0,
        failedBreakdown: stats?.failedBreakdown || {},
        failedVerifyBreakdown: stats?.failedVerifyBreakdown || {},
        failedSendBreakdown: stats?.failedSendBreakdown || {},
        convPercent: stats?.convPercent ?? 0,
        pubConvPercent: stats?.pubConvPercent ?? 0,
        pinRequest: stats?.pinRequest ?? 0,
        pinSendSuccess: stats?.pinSendSuccess ?? 0,
        uniquePinSend: stats?.uniquePinSend ?? 0,
        pinValRequest: stats?.pinValRequest ?? 0,
        uniquePinValRequest: stats?.uniquePinValRequest ?? 0,
        pinValSuccess: stats?.pinValSuccess ?? 0,
        pinValFailed: stats?.pinValFailed ?? stats?.failedVerify ?? 0,
        uniquePinVal: stats?.uniquePinVal ?? 0,
        sendConversion: stats?.sendConversion ?? 0,
        advCrPercent: stats?.advCrPercent ?? 0,
        pubCrPercent: stats?.pubCrPercent ?? 0,
        homeView: stats?.homeView ?? 0,
        subscribeClick: stats?.subscribeClick ?? 0,
        cgRedirect: stats?.cgRedirect ?? 0,
      }
    })
    for (const leftover of byId.values()) rows.push(leftover)
    return rows
  }, [vendorTrackings, vendorStats.vendors])

  return {
    vendorPreset,
    vendorCustomRange,
    setVendorCustomRange,
    vendorStatsLoading,
    vendorRows,
    vendorTrackings,
    activeVendors,
    handleVendorPresetChange,
    handleVendorCustomDateApply,
    loadVendorStats,
  }
}
