import { memo } from 'react'
import AppShell from '../../components/ui/AppShell'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import DashboardHeader from './components/DashboardHeader'
import DashboardKpiGrid from './components/DashboardKpiGrid'
import OperatorCallbacksCard from './components/OperatorCallbacksCard'
import VendorQueueCard from './components/VendorQueueCard'
import VendorQualityTable from './components/VendorQualityTable'
import TrafficTrendChart from './components/TrafficTrendChart'
import FunnelStatsCard from './components/FunnelStatsCard'
import ActiveMarketsGrid from './components/ActiveMarketsGrid'
import TopCampaignsAndVendors from './components/TopCampaignsAndVendors'
import LiveSessionsStream from './components/LiveSessionsStream'

export function DashboardPage() {
  const {
    timezone,
    preset,
    customRange,
    setCustomRange,
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
  } = useDashboardMetrics()

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-w-0">
        {/* Top Header & Filters */}
        <DashboardHeader
          timezone={timezone}
          preset={preset}
          handlePresetChange={handlePresetChange}
          fetchDashboardData={fetchDashboardData}
          refreshing={refreshing}
          loading={loading}
          selectedCountry={selectedCountry}
          handleCountryChange={handleCountryChange}
          availableCountries={availableCountries}
          selectedOperator={selectedOperator}
          handleOperatorChange={handleOperatorChange}
          availableOperators={availableOperators}
          selectedCampaignId={selectedCampaignId}
          setSelectedCampaignId={setSelectedCampaignId}
          availableCampaigns={availableCampaigns}
          handleClearFilters={handleClearFilters}
          customRange={customRange}
          setCustomRange={setCustomRange}
          handleCustomDateApply={handleCustomDateApply}
        />

        {/* 6 Top KPI Metrics Cards */}
        <DashboardKpiGrid
          loading={loading}
          totalVisits={totalVisits}
          totalConversions={totalConversions}
          conversionRate={conversionRate}
          filteredMarketsCount={filteredMarketsCount}
          activeCampaignsCount={activeCampaignsCount}
          filteredCampaignsCount={filteredCampaigns.length}
          vendorsCount={vendors.length}
          buildAnalyticsUrl={buildAnalyticsUrl}
        />

        {/* Operator HTTP callbacks + Vendor queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperatorCallbacksCard
            loading={loading}
            callbacksReceived={callbacksReceived}
            operatorStatusBreakdown={operatorStatusBreakdown}
          />
          <VendorQueueCard
            loading={loading}
            postbackStats={postbackStats}
            totalPostbacks={totalPostbacks}
          />
        </div>

        {/* Vendor Traffic & 30m CheckSub Quality Section */}
        <VendorQualityTable
          loading={loading}
          vendorQualityList={vendorQualityList}
        />

        {/* Interactive Charts: Visits Trend & Funnel Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TrafficTrendChart
            loading={loading}
            timeSeriesData={timeSeriesData}
          />
          <FunnelStatsCard
            loading={loading}
            funnelBreakdown={funnelBreakdown}
            totalVisits={totalVisits}
            buildAnalyticsUrl={buildAnalyticsUrl}
          />
        </div>

        {/* Markets Overview */}
        <ActiveMarketsGrid markets={markets} campaigns={campaigns} />

        {/* Top Campaigns & Top Vendors */}
        <TopCampaignsAndVendors
          campaigns={campaigns}
          vendors={vendors}
        />

        {/* Live Recent Sessions Activity Stream Table */}
        <LiveSessionsStream
          recentLogs={recentLogs}
          buildAnalyticsUrl={buildAnalyticsUrl}
        />
      </div>
    </AppShell>
  )
}

export default memo(DashboardPage)
