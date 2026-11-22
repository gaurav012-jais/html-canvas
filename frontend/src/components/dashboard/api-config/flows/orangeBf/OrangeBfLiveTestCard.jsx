import React from 'react'
import Button from '../../../../ui/Button'
import Input from '../../../../ui/Input'
import { ApiField } from '../../common/ApiField'
import { testSendOtp, testVerifyOtp, testOrangeBfSync } from '../../../../../services/api/campaigns'

export function OrangeBfLiveTestCard({
  orangeBfConfig,
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
  const handleOrangeBfTestSend = async () => {
    if (!testPhone) {
      alert('Please enter a phone number (+226...) for testing')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
      const sendUrl =
        orangeBfConfig.sendUrl?.trim() ||
        `${baseClean}/subapi/auth/otp/generate?msisdn={{msisdn}}&language=${
          orangeBfConfig.language || '_E'
        }`
      const res = await testSendOtp({
        phone: testPhone,
        provider: 'partner',
        config: JSON.stringify({
          sendUrl,
          method: orangeBfConfig.sendMethod || 'GET',
          bodyJson: orangeBfConfig.sendBodyJson || '',
          headersJson: orangeBfConfig.headersJson || '',
          successKey: orangeBfConfig.successKey || 'responseCode',
          successValue: orangeBfConfig.successValue || '0',
        }),
        campaignId,
      })
      if (res.providerRequestId) setLastProviderRequestId(res.providerRequestId)
      setTestResult(formatTestResult('SEND OTP', res))
    } catch (err) {
      setTestResult(`🔴 Dispatch error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleOrangeBfTestVerify = async () => {
    if (!testPhone || !testOtp) {
      alert('Please enter phone and OTP code')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
      const verifyUrl =
        orangeBfConfig.verifyUrl?.trim() ||
        `${baseClean}/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}`
      const res = await testVerifyOtp({
        phone: testPhone,
        otp: testOtp,
        provider: 'partner',
        config: JSON.stringify({
          verifyUrl,
          verifyMethod: orangeBfConfig.verifyMethod || 'GET',
          verifyBodyJson: orangeBfConfig.verifyBodyJson || '',
          headersJson: orangeBfConfig.headersJson || '',
          successKey: orangeBfConfig.successKey || 'responseCode',
          successValue: orangeBfConfig.successValue || '0',
        }),
        providerRequestId: lastProviderRequestId || undefined,
        campaignId,
      })
      setTestResult(formatTestResult('VERIFY OTP', res))
    } catch (err) {
      setTestResult(`🔴 Verify error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleOrangeBfTestSync = async () => {
    if (!testPhone) {
      alert('Please enter a phone number (+226...) for testing Subscription Engine Sync')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
      const syncUrl =
        orangeBfConfig.syncUrl?.trim() ||
        `${baseClean}/Subs_Engine/subscription/sync`
      const res = await testOrangeBfSync({
        phone: testPhone,
        config: JSON.stringify({
          ...orangeBfConfig,
          syncUrl,
          syncMethod: orangeBfConfig.syncMethod || 'GET',
          syncServiceId: orangeBfConfig.syncServiceId || orangeBfConfig.serviceId,
          syncSubServiceId: orangeBfConfig.syncSubServiceId || orangeBfConfig.subServiceId,
          syncReqType: orangeBfConfig.syncReqType != null ? orangeBfConfig.syncReqType : 1,
        }),
        campaignId,
      })
      setTestResult(formatTestResult('SUBSCRIPTION ENGINE SYNC', res))
    } catch (err) {
      setTestResult(`🔴 Sync error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-bg-subtle/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
        Orange BF Live OTP & Sync Test
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ApiField label="Test Phone (+226...)">
          <Input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="e.g. 56864685"
          />
        </ApiField>
        <ApiField label="OTP from SMS">
          <Input
            value={testOtp}
            onChange={(e) => setTestOtp(e.target.value)}
            placeholder="e.g. 4827"
          />
        </ApiField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={handleOrangeBfTestSend} disabled={testing}>
          {testing ? 'Sending...' : 'Send Orange BF OTP'}
        </Button>
        <Button variant="primary" size="sm" onClick={handleOrangeBfTestVerify} disabled={testing}>
          Verify Orange BF OTP
        </Button>
        <Button variant="secondary" size="sm" onClick={handleOrangeBfTestSync} disabled={testing}>
          Test Sync API
        </Button>
      </div>
      {testResult && (
        <div className="mt-2 max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-bg-base p-2 font-mono text-xs">
          {testResult}
        </div>
      )}
    </div>
  )
}
