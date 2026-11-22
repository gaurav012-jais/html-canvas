import { memo, useMemo } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Tabs from '../ui/Tabs'
import { normalizeModeId } from '../flow/verificationModes'
import { OrangeBfTab } from './api-config/flows/OrangeBfTab'
import { OtpLimitMessages } from './api-config/common/OtpLimitMessages'
import HeConfigTab from './api-config/tabs/HeConfigTab'
import DcbConfigTab from './api-config/tabs/DcbConfigTab'
import OtpConfigTab from './api-config/tabs/OtpConfigTab'
import ChecksubConfigTab from './api-config/tabs/ChecksubConfigTab'
import { useApiConfigForm } from './api-config/hooks/useApiConfigForm'

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-fg">{label}</label>
        {hint ? <span className="text-[11px] text-fg-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function CampaignApiConfigModal({ isOpen, onClose, campaignId, campaign }) {
  const mode = useMemo(() => normalizeModeId(campaign?.verificationMode), [campaign?.verificationMode])

  const availableTabs = useMemo(() => {
    if (mode === 'ORANGE_BF') {
      return [
        { id: 'orange_bf', label: 'Orange BF API' },
        { id: 'billing', label: 'Checksub Rules' },
      ]
    }
    if (mode === 'UNIVERSE_DCB') {
      return [
        { id: 'dcb', label: 'Universe DCB' },
        { id: 'billing', label: 'Status & Page Mapping' },
      ]
    }
    if (mode === 'OTP_ONLY') {
      return [
        { id: 'otp', label: 'Partner OTP' },
        { id: 'billing', label: 'Checksub' },
      ]
    }
    if (mode === 'HEADER_INJECTION') {
      return [
        { id: 'he', label: 'Detect phone (HE)' },
        { id: 'billing', label: 'Checksub' },
      ]
    }
    if (mode === 'NONE' || mode === 'CG_HOME') {
      return [
        { id: 'billing', label: 'Campaign Settings' },
      ]
    }
    return [
      { id: 'billing', label: 'Checksub' },
      { id: 'he', label: 'Detect phone' },
      { id: 'otp', label: 'Partner OTP' },
    ]
  }, [mode])

  const {
    loading,
    saving,
    activeTab,
    setActiveTab,
    form,
    setForm,
    heFields,
    setHeField,
    heConfigPreview,
    partnerConfig,
    setPartnerConfig,
    orangeBfConfig,
    setOrangeBfConfig,
    dcbConfig,
    setDcbConfig,
    checksubConfig,
    setChecksubConfig,
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
    handleSave,
    formatTestResult,
    handleHealthCheck,
    handleTestSend,
    handleTestVerify,
  } = useApiConfigForm({ isOpen, onClose, campaignId, mode, availableTabs })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Integration & Settings" size="lg">
      {loading ? (
        <p className="py-4 text-sm text-fg-muted">Loading configurations...</p>
      ) : (
        <div className="space-y-4">
          <Tabs
            tabs={availableTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {(activeTab === 'otp' || activeTab === 'orange_bf') && (
            <OtpLimitMessages
              config={activeTab === 'orange_bf' ? orangeBfConfig : partnerConfig}
              onChange={activeTab === 'orange_bf' ? setOrangeBfConfig : setPartnerConfig}
            />
          )}

          {activeTab === 'orange_bf' ? (
            <OrangeBfTab
              orangeBfConfig={orangeBfConfig}
              setOrangeBfConfig={setOrangeBfConfig}
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
          ) : activeTab === 'billing' ? (
            <ChecksubConfigTab
              mode={mode}
              form={form}
              setForm={setForm}
              checksubConfig={checksubConfig}
              setChecksubConfig={setChecksubConfig}
            />
          ) : activeTab === 'he' ? (
            <HeConfigTab
              form={form}
              setForm={setForm}
              heFields={heFields}
              setHeField={setHeField}
              heConfigPreview={heConfigPreview}
            />
          ) : activeTab === 'dcb' ? (
            <DcbConfigTab
              campaignId={campaignId}
              dcbConfig={dcbConfig}
              setDcbConfig={setDcbConfig}
            />
          ) : (
            <div className="space-y-4">
              <OtpConfigTab
                partnerConfig={partnerConfig}
                setPartnerConfig={setPartnerConfig}
              />
              <div className="space-y-3 rounded-xl border border-dashed border-border bg-bg-subtle/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">OTP API testing</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Test phone">
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g. 211911961169"
                    />
                  </Field>
                  <Field label="OTP from SMS">
                    <Input value={testOtp} onChange={(e) => setTestOtp(e.target.value)} placeholder="e.g. 4827" />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={testing}>
                    Health Check
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleTestSend} disabled={testing}>
                    {testing ? 'Processing...' : 'Send Test OTP'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleTestVerify} disabled={testing}>
                    Verify Test OTP
                  </Button>
                </div>
                {testResult && (
                  <div className="mt-2 max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-bg-base p-2 font-mono text-xs">
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || testing}>
              {saving ? 'Saving...' : 'Save API Settings'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default memo(CampaignApiConfigModal)
