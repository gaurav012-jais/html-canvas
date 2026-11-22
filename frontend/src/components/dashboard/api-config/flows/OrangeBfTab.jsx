import React from 'react'
import Input from '../../../ui/Input'
import { ApiField } from '../common/ApiField'
import { OrangeBfLiveTestCard } from './orangeBf/OrangeBfLiveTestCard'
import { OrangeBfAdvancedEndpoints } from './orangeBf/OrangeBfAdvancedEndpoints'

export function OrangeBfTab({
  orangeBfConfig,
  setOrangeBfConfig,
  campaignId,
  testPhone,
  setTestPhone,
  testOtp,
  setTestOtp,
  testing,
  setTesting,
  testResult,
  setTestResult,
  lastProviderRequestId,
  setLastProviderRequestId,
  formatTestResult,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#ff7900] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            Orange BF
          </span>
          <p className="text-xs font-semibold text-fg">
            Orange Burkina Faso — Subscription REST API v1.0.0
          </p>
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          Fully dynamic OTP & CheckSub engine. You can configure carrier parameters, custom endpoint
          URLs, GET/POST methods, request JSON bodies, and chain variables across requests.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ApiField label="API Base URL" hint="Carrier API Host">
            <Input
              value={orangeBfConfig.baseUrl}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, baseUrl: e.target.value }))}
              placeholder="http://103.153.58.55"
            />
          </ApiField>
        </div>

        <ApiField label="Parent Service ID (serviceId)" hint="e.g. Health Portal Livliness">
          <Input
            value={orangeBfConfig.serviceId}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, serviceId: e.target.value }))}
            placeholder="Health Portal Livliness"
          />
        </ApiField>

        <ApiField
          label="Sub-Service Plan ID (subServiceId)"
          hint="e.g. Health Portal Livliness pass jour"
        >
          <Input
            value={orangeBfConfig.subServiceId}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, subServiceId: e.target.value }))}
            placeholder="Health Portal Livliness pass jour"
          />
        </ApiField>

        <ApiField label="Content Provider ID (cpId)" hint="Default: 100">
          <Input
            value={orangeBfConfig.cpId}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, cpId: e.target.value }))}
            placeholder="100"
          />
        </ApiField>

        <ApiField label="Channel" hint="Default: ussd">
          <Input
            value={orangeBfConfig.channel}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, channel: e.target.value }))}
            placeholder="ussd"
          />
        </ApiField>

        <ApiField label="Country Code" hint="Default: BF">
          <Input
            value={orangeBfConfig.country}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, country: e.target.value }))}
            placeholder="BF"
          />
        </ApiField>

        <ApiField label="Operator Code" hint="Default: ORG">
          <Input
            value={orangeBfConfig.operator}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, operator: e.target.value }))}
            placeholder="ORG"
          />
        </ApiField>

        <ApiField label="SMS Language" hint="_E (English) or _A (Arabic)">
          <select
            className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
            value={orangeBfConfig.language}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, language: e.target.value }))}
          >
            <option value="_E">English (_E)</option>
            <option value="_A">Arabic (_A)</option>
          </select>
        </ApiField>

        <div className="grid grid-cols-2 gap-2">
          <ApiField label="Success Key" hint="default: responseCode">
            <Input
              value={orangeBfConfig.successKey}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, successKey: e.target.value }))}
              placeholder="responseCode"
            />
          </ApiField>
          <ApiField label="Success Value" hint="default: 0">
            <Input
              value={orangeBfConfig.successValue}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, successValue: e.target.value }))}
              placeholder="0"
            />
          </ApiField>
        </div>
      </div>

      <OrangeBfAdvancedEndpoints
        orangeBfConfig={orangeBfConfig}
        setOrangeBfConfig={setOrangeBfConfig}
      />

      <OrangeBfLiveTestCard
        orangeBfConfig={orangeBfConfig}
        campaignId={campaignId}
        testPhone={testPhone}
        setTestPhone={setTestPhone}
        testOtp={testOtp}
        setTestOtp={setTestOtp}
        testing={testing}
        setTesting={setTesting}
        testResult={testResult}
        setTestResult={setTestResult}
        lastProviderRequestId={lastProviderRequestId}
        setLastProviderRequestId={setLastProviderRequestId}
        formatTestResult={formatTestResult}
      />
    </div>
  )
}

export default OrangeBfTab
