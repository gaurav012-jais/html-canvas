import { useMemo } from 'react'
import { formatChartLabel } from '../../../utils/date'
import {
  STANDARD_EVENT_TYPES,
  isForeignFlowEvent,
  eventLabel,
  seriesColor,
} from '../logConstants'

export function useLogsChartData({
  aggs,
  currentFlowSpec,
  flowType,
  chartEventCategory,
  compareEvents,
  filters,
  isHourly,
  dateFormat,
  timezone,
}) {
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

  return {
    totalEvents,
    otpStats,
    eventTypeOptions,
    statusOptions,
    eventsByTypeData,
    statusDistributionData,
    timeSeriesData,
    funnelCompareData,
    selectedSeries,
    funnelTotals,
    funnelBarData,
    compareRatio,
    compareRatioHint,
  }
}
