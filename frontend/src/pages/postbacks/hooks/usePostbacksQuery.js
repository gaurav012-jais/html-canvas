import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getDateRangeForPreset,
  DEFAULT_TIMEZONE,
} from '../../../utils/date'
import {
  getPostbackSummary,
  listPostbacks,
  exportPostbackDayReport,
  firePostback,
  runChecksubNow,
} from '../../../services/api/partners'
import useStore from '../../../store/useStore'
import { PAGE_SIZE, STATUS_FILTERS } from '../postbackConstants'

export function usePostbacksQuery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const timezone = useStore((s) => s.timezone) || DEFAULT_TIMEZONE
  const campaigns = useStore((s) => s.campaigns) || []
  const fetchCampaigns = useStore((s) => s.fetchCampaigns)
  const vendors = useStore((s) => s.vendors) || []
  const fetchVendors = useStore((s) => s.fetchVendors)
  const addToast = useStore((s) => s.addToast)

  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const statusFromUrl = String(searchParams.get('status') || 'all').toLowerCase()
  const [status, setStatus] = useState(
    STATUS_FILTERS.some((f) => f.id === statusFromUrl) ? statusFromUrl : 'all',
  )
  const [operatorStatus, setOperatorStatus] = useState(
    () => String(searchParams.get('operatorStatus') || '').trim().toLowerCase(),
  )
  const [campaignId, setCampaignId] = useState(
    () => searchParams.get('campaignId') || searchParams.get('offer') || '',
  )
  const [vendorId, setVendorId] = useState(
    () => searchParams.get('vendorId') || '',
  )
  const [q, setQ] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [datePreset, setDatePreset] = useState(() => {
    if (searchParams.get('from') || searchParams.get('to')) return 'custom'
    return 'today'
  })
  const [dateRange, setDateRange] = useState(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from || to) {
      return { from: from || '', to: to || '' }
    }
    return getDateRangeForPreset('today', timezone)
  })
  const [exporting, setExporting] = useState(false)
  const [firingId, setFiringId] = useState(null)
  const [checksubingId, setChecksubingId] = useState(null)

  useEffect(() => {
    fetchCampaigns().catch(() => {})
    fetchVendors().catch(() => {})
  }, [fetchCampaigns, fetchVendors])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rangeParams = {
        from: dateRange.from || undefined,
        to: dateRange.to || undefined,
        timezone,
      }
      const [sum, list] = await Promise.all([
        getPostbackSummary({
          ...rangeParams,
          campaignId: campaignId || undefined,
          vendorId: vendorId || undefined,
        }),
        listPostbacks({
          page,
          limit: PAGE_SIZE,
          status,
          operatorStatus: operatorStatus || undefined,
          q,
          vendorId: vendorId || undefined,
          campaignId: campaignId || undefined,
          ...rangeParams,
        }),
      ])
      setSummary(sum)
      setItems(list?.items || [])
      setTotal(list?.total || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load postbacks')
    } finally {
      setLoading(false)
    }
  }, [page, status, operatorStatus, q, vendorId, campaignId, dateRange.from, dateRange.to, timezone])

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

  useEffect(() => {
    if (datePreset === 'custom' || !timezone) return
    const range = getDateRangeForPreset(datePreset, timezone)
    const timer = setTimeout(() => {
      setDateRange((current) => {
        if (current.from === range.from && current.to === range.to) return current
        return range
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [timezone, datePreset])

  const applyDatePreset = (preset) => {
    setDatePreset(preset)
    setPage(1)
    if (preset === 'custom') return
    setDateRange(getDateRangeForPreset(preset, timezone))
  }

  const updateDateField = (key, value) => {
    setDatePreset('custom')
    setPage(1)
    setDateRange((current) => ({ ...current, [key]: value }))
  }

  const logsQuery = (extra = {}) => {
    const params = new URLSearchParams()
    params.set('preset', datePreset)
    if (dateRange.from) params.set('from', dateRange.from)
    if (dateRange.to) params.set('to', dateRange.to)
    if (campaignId) params.set('campaignId', campaignId)
    if (vendorId) params.set('vendorId', vendorId)
    if (extra.filter) params.set('filter', extra.filter)
    return `/postbacks/day-logs?${params.toString()}`
  }

  const exportLogs = async () => {
    if (!dateRange.from || !dateRange.to) return
    setExporting(true)
    try {
      const result = await exportPostbackDayReport({
        from: dateRange.from,
        to: dateRange.to,
        timezone,
        campaignId: campaignId || undefined,
        vendorId: vendorId || undefined,
        format: 'csv',
      })
      addToast(`Exported ${result.filename} (also saved on server)`, 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to export logs', 'error')
    } finally {
      setExporting(false)
    }
  }

  const fireVendorPostback = async (row, e) => {
    e.stopPropagation()
    if (!row?.id || firingId) return
    const alreadySent = String(row.status || '').toLowerCase() === 'sent'
    const label = row.msisdn || `#${row.id}`
    const ok = window.confirm(
      alreadySent
        ? `Postback for ${label} was already sent. Fire it again?`
        : `Fire vendor postback for ${label}?`,
    )
    if (!ok) return
    setFiringId(row.id)
    try {
      const result = await firePostback(row.id, { force: alreadySent })
      if (result?.skipped || result?.vendorSkipped) {
        addToast(result.reason || 'Postback was not sent', 'error')
      } else if (result?.success === false) {
        addToast(result.error || result.errorMessage || 'Vendor postback failed', 'error')
      } else {
        addToast(`Fired postback for ${label}`, 'success')
      }
      await load()
    } catch (err) {
      addToast(err?.message || 'Failed to fire postback', 'error')
    } finally {
      setFiringId(null)
    }
  }

  const handleRunChecksubNow = async (row, e) => {
    e.stopPropagation()
    if (!row?.id || checksubingId) return
    setChecksubingId(row.id)
    try {
      const result = await runChecksubNow(row.id)
      if (result?.error) {
        addToast(result.error || 'Checksub failed', 'error')
      } else {
        const outcome = result?.outcome || result?.delayed_checksub_outcome || '—'
        addToast(`Checksub done: ${outcome}`, 'success')
      }
      await load()
    } catch (err) {
      addToast(err?.message || 'Checksub failed', 'error')
    } finally {
      setChecksubingId(null)
    }
  }

  const campaignOptions = useMemo(() => {
    return campaigns.map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.id})`,
      sublabel: [
        c.trackingId ? `ID: ${c.trackingId}` : '',
        c.country && c.operator ? `${c.country} / ${c.operator}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      searchKey: `${c.name} ${c.id} ${c.trackingId || ''} ${c.country || ''} ${c.operator || ''}`,
    }))
  }, [campaigns])

  const vendorOptions = useMemo(() => {
    const map = new Map()
    vendors.forEach((v) => {
      map.set(String(v.id), {
        value: String(v.id),
        label: `${v.name} (${v.id})`,
        sublabel: v.code ? `Code: ${v.code}` : '',
        searchKey: `${v.name} ${v.id} ${v.code || ''}`,
      })
    })
    if (summary?.byVendor) {
      summary.byVendor.forEach((v) => {
        if (v.vendorId && !map.has(String(v.vendorId))) {
          map.set(String(v.vendorId), {
            value: String(v.vendorId),
            label: `${v.vendorName || 'Vendor'} (${v.vendorId})`,
            sublabel: v.vendorCode ? `Code: ${v.vendorCode}` : '',
            searchKey: `${v.vendorName || ''} ${v.vendorId} ${v.vendorCode || ''}`,
          })
        }
      })
    }
    return Array.from(map.values())
  }, [vendors, summary])

  const handleResetFilters = () => {
    setCampaignId('')
    setVendorId('')
    setOperatorStatus('')
    setQ('')
    setSearchDraft('')
    setStatus('all')
    applyDatePreset('today')
    setSearchParams({})
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setQ(searchDraft.trim())
    setPage(1)
  }

  const handleSelectCampaign = (val) => {
    setCampaignId(val)
    setPage(1)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!val) {
        next.delete('campaignId')
        next.delete('offer')
      } else {
        next.set('campaignId', val)
      }
      return next
    })
  }

  const handleSelectVendor = (val) => {
    setVendorId(val)
    setPage(1)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!val) {
        next.delete('vendorId')
      } else {
        next.set('vendorId', val)
      }
      return next
    })
  }

  const handleSelectStatus = (newStatus) => {
    setStatus(newStatus)
    setPage(1)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newStatus === 'all') next.delete('status')
      else next.set('status', newStatus)
      return next
    })
  }

  const handleSelectOperatorStatus = (newOpStatus) => {
    setOperatorStatus(newOpStatus)
    setPage(1)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('operatorStatus', newOpStatus)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    campaigns,
    vendors,
    summary,
    items,
    total,
    page,
    totalPages,
    status,
    operatorStatus,
    campaignId,
    vendorId,
    q,
    searchDraft,
    loading,
    error,
    datePreset,
    dateRange,
    exporting,
    firingId,
    checksubingId,
    campaignOptions,
    vendorOptions,
    load,
    applyDatePreset,
    updateDateField,
    logsQuery,
    exportLogs,
    fireVendorPostback,
    handleRunChecksubNow,
    handleResetFilters,
    handleSearchSubmit,
    handleSelectCampaign,
    handleSelectVendor,
    handleSelectStatus,
    handleSelectOperatorStatus,
    setSearchDraft,
    setPage,
  }
}
