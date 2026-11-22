import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_TIMEZONE,
  getDateRangeForPreset,
} from '../../../utils/date'
import { getPostbackDayReport, getPostbackStats, exportPostbackDayReport } from '../../../services/api/partners'
import useStore from '../../../store/useStore'
import {
  FILTER_IDS,
  HIT_FILTER_IDS,
  GROUP_BY,
  PAGE_SIZE,
  groupByDate,
  ymdOf,
} from '../dayLogConstants'

export function useDayLogsQuery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const campaigns = useStore((s) => s.campaigns) || []
  const vendors = useStore((s) => s.vendors) || []
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const fetchVendors = useStore((s) => s.fetchVendors)
  const addToast = useStore((s) => s.addToast)

  const [datePreset, setDatePreset] = useState(
    () => searchParams.get('preset') || 'today',
  )
  const [customRange, setCustomRange] = useState(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from && to) return { from, to }
    return getDateRangeForPreset('today', timezone)
  })
  const dateRange =
    datePreset === 'custom'
      ? customRange
      : getDateRangeForPreset(datePreset, timezone)

  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState(() => searchParams.get('q') || '')
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get('q') || '')
  const [filter, setFilter] = useState(() => {
    const f = searchParams.get('filter')
    return FILTER_IDS.has(f) ? f : 'all'
  })
  const [hitFilter, setHitFilter] = useState(() => {
    const f = searchParams.get('hitFilter')
    return HIT_FILTER_IDS.has(f) ? f : 'all'
  })
  const [view, setView] = useState(() => {
    const v = searchParams.get('view')
    if (v === 'hits' || v === 'numbers') return v
    const f = searchParams.get('filter')
    return FILTER_IDS.has(f) && f !== 'all' ? 'numbers' : 'hits'
  })
  const [campaignId, setCampaignId] = useState(() => searchParams.get('campaignId') || '')
  const [vendorId, setVendorId] = useState(() => searchParams.get('vendorId') || '')
  const [groupBy, setGroupBy] = useState(() => {
    const g = searchParams.get('groupBy')
    return GROUP_BY.some((x) => x.id === g) ? g : 'date'
  })
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page'), 10) || 1))
  const [expanded, setExpanded] = useState(() => new Set())
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchCampaigns().catch(() => {})
    fetchVendors().catch(() => {})
  }, [fetchCampaigns, fetchVendors])

  const reportParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      timezone,
      campaignId: campaignId || undefined,
      vendorId: vendorId || undefined,
      outcome: filter,
      hitType: hitFilter,
      q: q || undefined,
      view,
      page,
      limit: PAGE_SIZE,
    }),
    [
      dateRange.from,
      dateRange.to,
      timezone,
      campaignId,
      vendorId,
      filter,
      hitFilter,
      q,
      view,
      page,
    ],
  )

  const load = useCallback(async ({ writeFile = false } = {}) => {
    if (!dateRange.from || !dateRange.to) return
    setLoading(true)
    setError('')
    try {
      const [statsRes, res] = await Promise.all([
        getPostbackStats({
          from: dateRange.from,
          to: dateRange.to,
          timezone,
          campaignId: campaignId || undefined,
          vendorId: vendorId || undefined,
          groupBy,
        }),
        getPostbackDayReport({ ...reportParams, writeFile }),
      ])
      setStats(statsRes)
      setData(res)
      setExpanded(new Set())
    } catch (err) {
      setError(err?.message || 'Failed to load day logs')
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to, timezone, campaignId, vendorId, groupBy, reportParams])

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      if (active) load()
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [load])

  const patchParams = (mutate) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    setSearchParams(next)
  }

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') {
      setCustomRange({ from: dateRange.from, to: dateRange.to })
      patchParams((next) => {
        next.set('preset', preset)
        next.set('page', '1')
        if (dateRange.from) next.set('from', dateRange.from)
        if (dateRange.to) next.set('to', dateRange.to)
      })
      return
    }
    const range = getDateRangeForPreset(preset, timezone)
    setCustomRange(range)
    patchParams((next) => {
      next.set('preset', preset)
      next.set('page', '1')
      next.set('from', range.from)
      next.set('to', range.to)
    })
  }

  const updateDateField = (key, value) => {
    setDatePreset('custom')
    setPage(1)
    setCustomRange((current) => ({ ...current, [key]: value }))
    patchParams((next) => {
      next.set('preset', 'custom')
      next.set('page', '1')
      const from = key === 'from' ? value : customRange.from
      const to = key === 'to' ? value : customRange.to
      if (from) next.set('from', from)
      if (to) next.set('to', to)
    })
  }

  const applyFilter = (id) => {
    setFilter(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (!id || id === 'all') next.delete('filter')
      else next.set('filter', id)
    })
  }

  const applyHitFilter = (id) => {
    setHitFilter(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (!id || id === 'all') next.delete('hitFilter')
      else next.set('hitFilter', id)
    })
  }

  const applyView = (id) => {
    setView(id)
    setPage(1)
    patchParams((next) => {
      next.set('view', id)
      next.set('page', '1')
    })
  }

  const applyCampaign = (id) => {
    setCampaignId(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (id) next.set('campaignId', id)
      else next.delete('campaignId')
    })
  }

  const applyVendor = (id) => {
    setVendorId(id)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (id) next.set('vendorId', id)
      else next.delete('vendorId')
    })
  }

  const applyGroupBy = (id) => {
    setGroupBy(id)
    patchParams((next) => next.set('groupBy', id))
  }

  const applySearch = (value) => {
    const nextQ = value.trim()
    setQ(nextQ)
    setPage(1)
    patchParams((next) => {
      next.set('page', '1')
      if (nextQ) next.set('q', nextQ)
      else next.delete('q')
    })
  }

  const drillStatsRow = (row) => {
    setPage(1)
    if (row.statDate) {
      setDatePreset('custom')
      setCustomRange({ from: row.statDate, to: row.statDate })
    }
    if (row.campaignId) setCampaignId(String(row.campaignId))
    if (row.vendorId) setVendorId(String(row.vendorId))
    setView('hits')
    patchParams((next) => {
      next.set('view', 'hits')
      next.set('page', '1')
      if (row.statDate) {
        next.set('preset', 'custom')
        next.set('from', row.statDate)
        next.set('to', row.statDate)
      }
      if (row.campaignId) next.set('campaignId', String(row.campaignId))
      if (row.vendorId) next.set('vendorId', String(row.vendorId))
    })
  }

  const exportLogs = async (format) => {
    if (!dateRange.from || !dateRange.to) return
    setExporting(true)
    try {
      const result = await exportPostbackDayReport({
        ...reportParams,
        format,
      })
      addToast(`Exported ${result.filename}`, 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to export logs', 'error')
    } finally {
      setExporting(false)
    }
  }

  const numbers = data?.numbers || []
  const hits = data?.hits || []

  const numberGroups = useMemo(
    () =>
      groupByDate(numbers, timezone, (row) =>
        ymdOf(
          row.queuedAt || row.billingReceivedAt || row.heRedirectedAt || row.vendorFiredAt,
          timezone,
        ),
      ),
    [numbers, timezone],
  )

  const hitGroups = useMemo(
    () => groupByDate(hits, timezone, (row) => row.date || ymdOf(row.at, timezone)),
    [hits, timezone],
  )

  const summary = data?.summary
  const file = data?.file
  const totalRows = data?.total || 0
  const totalPages = Math.max(1, data?.totalPages || 1)

  const goToPage = (nextPage) => {
    const safe = Math.min(totalPages, Math.max(1, nextPage))
    setPage(safe)
    patchParams((next) => next.set('page', String(safe)))
  }

  const toggleRowExpanded = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return {
    timezone,
    campaigns,
    vendors,
    datePreset,
    dateRange,
    data,
    stats,
    loading,
    error,
    searchDraft,
    setSearchDraft,
    filter,
    hitFilter,
    view,
    campaignId,
    vendorId,
    groupBy,
    page,
    expanded,
    exporting,
    summary,
    file,
    totalRows,
    totalPages,
    hitGroups,
    numberGroups,
    hits,
    numbers,
    load,
    applyDatePreset,
    updateDateField,
    applyFilter,
    applyHitFilter,
    applyView,
    applyCampaign,
    applyVendor,
    applyGroupBy,
    applySearch,
    drillStatsRow,
    exportLogs,
    goToPage,
    toggleRowExpanded,
  }
}
