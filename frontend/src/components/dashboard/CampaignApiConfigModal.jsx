import { memo, useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Tabs from '../ui/Tabs'
import useStore from '../../store/useStore'
import {
  testSendOtp,
  testVerifyOtp,
  checkOtpProviderHealth,
  PAGE_TYPES,
  PAGE_TYPE_LABELS,
} from '../../services/api/campaigns'
import {
  DEFAULT_DCB_CONFIG,
  buildDcbApiGuide,
  parseDcbConfig,
  previewConfirmPayload,
  previewPincodePayload,
  serializeDcbConfig,
} from './dcbConfig'
import { normalizeModeId } from '../flow/verificationModes'
import { OrangeBfTab } from './api-config/flows/OrangeBfTab'
import { OtpLimitMessages } from './api-config/common/OtpLimitMessages'
import HeConfigTab from './api-config/tabs/HeConfigTab'
import DcbConfigTab from './api-config/tabs/DcbConfigTab'
import OtpConfigTab from './api-config/tabs/OtpConfigTab'
import ChecksubConfigTab from './api-config/tabs/ChecksubConfigTab'

const DEFAULT_ORANGE_BF_CONFIG = {
  baseUrl: 'http://103.153.58.55',
  serviceId: 'Health Portal Livliness',
  subServiceId: 'Health Portal Livliness pass jour',
  cpId: '100',
  channel: 'ussd',
  country: 'BF',
  operator: 'ORG',
  language: '_E',
  successKey: 'responseCode',
  successValue: '0',
  sendUrl: '',
  sendMethod: 'GET',
  sendBodyJson: '',
  verifyUrl: '',
  verifyMethod: 'GET',
  verifyBodyJson: '',
  checksubUrl: '',
  checksubMethod: 'GET',
  checksubBodyJson: '',
  headersJson: '',
  syncEnabled: true,
  syncUrl: 'http://103.153.58.55/Subs_Engine/subscription/sync?msisdn={{msisdn}}&subServiceId={{subServiceId}}&serviceId={{serviceId}}&cpId={{cpId}}&channel={{channel}}&country={{country}}&operator={{operator}}&reqType=1',
  syncMethod: 'GET',
  syncServiceId: 'Health Portal Livliness NAR',
  syncSubServiceId: 'Health Portal Livliness acte jour',
  syncReqType: '1',
  syncBodyJson: '',
}

const DEFAULT_PARTNER = {
  sendUrl: '',
  verifyUrl: '',
  method: 'GET',
  verifyMethod: 'GET',
  headersJson: '',
  bodyJson: '',
  verifyBodyJson: '',
  successKey: 'responseCode',
  successValue: '0',
  payoutPercent: 100,
}

function clampPayoutPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, Math.round(n)))
}

const DEFAULT_CHECKSUB = {
  statusField: 'currentStatus',
  rules: [],
  missGo: 'continue',
  missPage: 'ERROR',
  missUrl: '',
}

const CHECKSUB_PAGE_OPTIONS = PAGE_TYPES.filter((id) =>
  ['THANKYOU', 'INPROGRESS', 'LOW_BALANCE', 'BLOCKED', 'ERROR', 'HOME', 'OTP', 'CONFIRM'].includes(id)
)

function parseChecksubConfig(raw) {
  if (!raw) return { ...DEFAULT_CHECKSUB, rules: [] }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CHECKSUB, rules: [] }
    }
    const rules = Array.isArray(parsed.rules)
      ? parsed.rules.map((r) => ({
          value: r?.value != null ? String(r.value) : '',
          go: r?.go === 'page' || r?.go === 'external' ? r.go : 'continue',
          page: r?.page || 'THANKYOU',
          url: r?.url || '',
        }))
      : []
    return {
      statusField: parsed.statusField || 'currentStatus',
      rules,
      missGo: parsed.missGo === 'page' || parsed.missGo === 'external' ? parsed.missGo : 'continue',
      missPage: parsed.missPage || 'ERROR',
      missUrl: parsed.missUrl || '',
    }
  } catch {
    return { ...DEFAULT_CHECKSUB, rules: [] }
  }
}

function serializeChecksubConfig(cfg) {
  if (!cfg) return null
  const rules = (cfg.rules || [])
    .map((r) => ({
      value: String(r.value || '').trim(),
      go: r.go === 'page' || r.go === 'external' ? r.go : 'continue',
      page: r.page || 'THANKYOU',
      url: String(r.url || '').trim(),
    }))
    .filter((r) => r.value)
  const statusField = String(cfg.statusField || 'currentStatus').trim() || 'currentStatus'
  const missGo = cfg.missGo === 'page' || cfg.missGo === 'external' ? cfg.missGo : 'continue'
  const isDefault = rules.length === 0 && statusField === 'currentStatus' && missGo === 'continue'
  if (isDefault) return null
  return JSON.stringify({
    statusField,
    rules,
    missGo,
    missPage: cfg.missPage || 'ERROR',
    missUrl: String(cfg.missUrl || '').trim(),
  })
}

const HE_MODES = [
  {
    id: 'header',
    title: 'Network header',
    subtitle: 'X-MSISDN from carrier (default)',
  },
  {
    id: 'none',
    title: 'Off',
    subtitle: 'OTP only — no auto-detect',
  },
  {
    id: 'custom_http',
    title: 'Custom API',
    subtitle: 'Operator resolve URL',
  },
  {
    id: 'safaricom_masked',
    title: 'Token + MSISDN',
    subtitle: 'Token API then masked number',
  },
]

const EMPTY_HE_FIELDS = {
  tokenUrl: '',
  maskedUrl: '',
  resolveUrl: '',
  failMessage: '',
  failRedirectUrl: '',
  successRedirectUrl: '',
}

function parseHeConfig(raw) {
  if (!raw) return { ...EMPTY_HE_FIELDS }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_HE_FIELDS }
    return {
      tokenUrl: parsed.tokenUrl || parsed.heTokenUrl || '',
      maskedUrl: parsed.maskedUrl || parsed.maskedMsisdnUrl || '',
      resolveUrl: parsed.url || parsed.resolveUrl || '',
      failMessage: parsed.failMessage || '',
      failRedirectUrl: parsed.failRedirectUrl || parsed.heFailRedirectUrl || '',
      successRedirectUrl: parsed.successRedirectUrl || parsed.heSuccessRedirectUrl || '',
    }
  } catch {
    return { ...EMPTY_HE_FIELDS }
  }
}

function buildHeConfigJson(provider, fields, resolveMsisdnUrl) {
  if (provider === 'header' || provider === 'none') return ''

  const out = {}
  if (provider === 'safaricom_masked') {
    if (fields.tokenUrl.trim()) out.tokenUrl = fields.tokenUrl.trim()
    if (fields.maskedUrl.trim()) out.maskedUrl = fields.maskedUrl.trim()
  }
  if (provider === 'custom_http') {
    const url = (fields.resolveUrl || resolveMsisdnUrl || '').trim()
    if (url) out.url = url
  }
  if (fields.failMessage.trim()) out.failMessage = fields.failMessage.trim()
  if (fields.failRedirectUrl.trim()) {
    out.failRedirectUrl = fields.failRedirectUrl.trim()
  }
  if (fields.successRedirectUrl.trim()) {
    out.successRedirectUrl = fields.successRedirectUrl.trim()
  }
  return Object.keys(out).length ? JSON.stringify(out, null, 2) : ''
}

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
  const loadCampaignApiConfig = useStore((s) => s.loadCampaignApiConfig)
  const saveCampaignApiConfig = useStore((s) => s.saveCampaignApiConfig)
  const addToast = useStore((s) => s.addToast)

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
    // Default / BOTH
    return [
      { id: 'billing', label: 'Checksub' },
      { id: 'he', label: 'Detect phone' },
      { id: 'otp', label: 'Partner OTP' },
    ]
  }, [mode])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(() => availableTabs[0]?.id || 'billing')

  const [form, setForm] = useState({
    subscriptionApi: '',
    subscribeApi: '',
    blocklistApi: '',
    headersJson: '',
    resolveMsisdnUrl: '',
    heProvider: 'header',
  })
  const [heFields, setHeFields] = useState(EMPTY_HE_FIELDS)
  const [partnerConfig, setPartnerConfig] = useState(DEFAULT_PARTNER)
  const [orangeBfConfig, setOrangeBfConfig] = useState(DEFAULT_ORANGE_BF_CONFIG)
  const [dcbConfig, setDcbConfig] = useState(() => parseDcbConfig(null))
  const [checksubConfig, setChecksubConfig] = useState(() => ({
    ...DEFAULT_CHECKSUB,
    rules: [],
  }))

  const [testPhone, setTestPhone] = useState('')
  const [testOtp, setTestOtp] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [lastProviderRequestId, setLastProviderRequestId] = useState('')

  useEffect(() => {
    if (!isOpen || !campaignId) return
    setLoading(true)
    setTestResult('')
    setTestPhone('')
    setTestOtp('')

    const initialTab = mode === 'ORANGE_BF' ? 'orange_bf' : (availableTabs[0]?.id || 'billing')
    setActiveTab(initialTab)

    loadCampaignApiConfig(campaignId)
      .then((config = {}) => {
        const isOrangeBf = mode === 'ORANGE_BF'
        const provider = config?.heProvider || 'header'
        const parsedHe = parseHeConfig(config?.heConfigJson)

        const defaultSubscriptionApi = isOrangeBf
          ? 'http://103.153.58.55/subapi/checksub?msisdn={{msisdn}}&serviceId=Health Portal Livliness'
          : ''

        setForm({
          subscriptionApi: config?.subscriptionApi || defaultSubscriptionApi,
          subscribeApi: config?.subscribeApi || '',
          blocklistApi: config?.blocklistApi || '',
          headersJson: config?.headersJson || '',
          resolveMsisdnUrl: config?.resolveMsisdnUrl || parsedHe.resolveUrl || '',
          heProvider: provider,
        })
        setChecksubConfig(parseChecksubConfig(config?.checksubConfigJson))
        setDcbConfig(parseDcbConfig(config?.dcbConfigJson || config?.dcb_config_json))
        setHeFields({
          ...parsedHe,
          resolveUrl: config?.resolveMsisdnUrl || parsedHe.resolveUrl || '',
        })

        if (isOrangeBf) {
          try {
            const hParsed = config?.headersJson ? JSON.parse(config.headersJson) : {}
            const oParsed = config?.otpConfigJson ? JSON.parse(config.otpConfigJson) : {}
            const merged = { ...hParsed, ...oParsed }
            setOrangeBfConfig({
              ...DEFAULT_ORANGE_BF_CONFIG,
              ...merged,
              baseUrl: merged.baseUrl || (config?.sendUrl ? new URL(config.sendUrl).origin : DEFAULT_ORANGE_BF_CONFIG.baseUrl),
              sendUrl: merged.sendUrl || config?.sendUrl || '',
              sendMethod: merged.sendMethod || merged.method || 'GET',
              sendBodyJson: merged.sendBodyJson || merged.bodyJson || '',
              verifyUrl: merged.verifyUrl || config?.verifyUrl || '',
              verifyMethod: merged.verifyMethod || 'GET',
              verifyBodyJson: merged.verifyBodyJson || '',
              checksubUrl: merged.checksubUrl || config?.subscriptionApi || '',
              checksubMethod: merged.checksubMethod || 'GET',
              checksubBodyJson: merged.checksubBodyJson || '',
              headersJson: merged.headersJson || '',
              syncUrl: merged.syncUrl || DEFAULT_ORANGE_BF_CONFIG.syncUrl,
              syncServiceId: merged.syncServiceId || DEFAULT_ORANGE_BF_CONFIG.syncServiceId,
              syncSubServiceId: merged.syncSubServiceId || DEFAULT_ORANGE_BF_CONFIG.syncSubServiceId,
              syncReqType: merged.syncReqType != null ? merged.syncReqType : DEFAULT_ORANGE_BF_CONFIG.syncReqType,
              syncEnabled: merged.syncEnabled !== undefined ? Boolean(merged.syncEnabled) : true,
              successKey: config?.successKey || merged.successKey || 'responseCode',
              successValue: config?.successValue ?? merged.successValue ?? '0',
            })
          } catch {
            setOrangeBfConfig(DEFAULT_ORANGE_BF_CONFIG)
          }
        } else if (config?.headersJson) {
          try {
            const parsed = JSON.parse(config.headersJson)
            if (parsed && typeof parsed === 'object') {
              setOrangeBfConfig({
                ...DEFAULT_ORANGE_BF_CONFIG,
                ...parsed,
                baseUrl: config?.sendUrl ? new URL(config.sendUrl).origin : (parsed.baseUrl || DEFAULT_ORANGE_BF_CONFIG.baseUrl),
                successKey: config?.successKey || parsed.successKey || 'responseCode',
                successValue: config?.successValue ?? parsed.successValue ?? '0',
              })
            }
          } catch {
            setOrangeBfConfig(DEFAULT_ORANGE_BF_CONFIG)
          }
        } else {
          setOrangeBfConfig(DEFAULT_ORANGE_BF_CONFIG)
        }

        if (config?.otpConfigJson) {
          try {
            const parsed = JSON.parse(config.otpConfigJson)
            const source =
              parsed?.failover && parsed?.providers?.partner?.config ? parsed.providers.partner.config : parsed
            setPartnerConfig({
              ...DEFAULT_PARTNER,
              ...source,
              successKey: source.successKey || 'responseCode',
              successValue: source.successValue ?? '0',
              payoutPercent: clampPayoutPercent(source.payoutPercent ?? DEFAULT_PARTNER.payoutPercent),
            })
          } catch (e) {
            console.error('Failed to parse OTP config JSON', e)
            setPartnerConfig(DEFAULT_PARTNER)
          }
        } else if (isOrangeBf) {
          setPartnerConfig({
            ...DEFAULT_PARTNER,
            sendUrl: 'http://103.153.58.55/subapi/auth/otp/generate?msisdn={{msisdn}}&language=_E',
            verifyUrl: 'http://103.153.58.55/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}',
            successKey: 'responseCode',
            successValue: '0',
            payoutPercent: 100,
          })
        } else {
          setPartnerConfig(DEFAULT_PARTNER)
        }
      })
      .catch((err) => addToast(err.message || 'Failed to load API config', 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, campaignId, mode, availableTabs, loadCampaignApiConfig, addToast])

  const heConfigPreview = useMemo(
    () => buildHeConfigJson(form.heProvider, heFields, form.resolveMsisdnUrl),
    [form.heProvider, heFields, form.resolveMsisdnUrl]
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const isOrangeBf = mode === 'ORANGE_BF'
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '')
      const heConfigJson = buildHeConfigJson(form.heProvider, heFields, form.resolveMsisdnUrl)
      const resolveMsisdnUrl =
        form.heProvider === 'custom_http'
          ? (heFields.resolveUrl || form.resolveMsisdnUrl || '').trim()
          : form.resolveMsisdnUrl || null

      const finalSendUrl = isOrangeBf
        ? (orangeBfConfig.sendUrl?.trim() || `${baseClean}/subapi/auth/otp/generate`)
        : partnerConfig.sendUrl
      const finalVerifyUrl = isOrangeBf
        ? (orangeBfConfig.verifyUrl?.trim() || `${baseClean}/subapi/auth/otp/validate`)
        : partnerConfig.verifyUrl
      const finalChecksubUrl = isOrangeBf
        ? (orangeBfConfig.checksubUrl?.trim() || `${baseClean}/subapi/checksub`)
        : form.subscriptionApi

      await saveCampaignApiConfig(campaignId, {
        ...form,
        subscriptionApi: finalChecksubUrl,
        headersJson: isOrangeBf ? JSON.stringify(orangeBfConfig) : form.headersJson,
        resolveMsisdnUrl: resolveMsisdnUrl || null,
        heConfigJson: heConfigJson || null,
        subscribeApi: (form.subscribeApi || '').trim() || null,
        sendUrl: finalSendUrl,
        verifyUrl: finalVerifyUrl,
        successKey: isOrangeBf ? (orangeBfConfig.successKey || 'responseCode') : partnerConfig.successKey,
        successValue: isOrangeBf ? (orangeBfConfig.successValue || '0') : partnerConfig.successValue,
        otpConfigJson: JSON.stringify(
          isOrangeBf
            ? {
                ...orangeBfConfig,
                sendUrl: finalSendUrl,
                verifyUrl: finalVerifyUrl,
                checksubUrl: finalChecksubUrl,
                method: orangeBfConfig.sendMethod || 'GET',
                verifyMethod: orangeBfConfig.verifyMethod || 'GET',
                successKey: orangeBfConfig.successKey || 'responseCode',
                successValue: orangeBfConfig.successValue || '0',
                payoutPercent: 100,
              }
            : {
                ...partnerConfig,
                payoutPercent: clampPayoutPercent(partnerConfig.payoutPercent),
              }
        ),
        checksubConfigJson: serializeChecksubConfig(checksubConfig),
        dcbConfigJson: serializeDcbConfig(dcbConfig),
      })
      onClose()
    } catch {
      // toast in slice
    } finally {
      setSaving(false)
    }
  }

  const formatTestResult = (label, res) => {
    const rule = res.successRule || {}
    const ruleText = rule.key ? `Success rule: ${rule.key} = ${rule.value}` : ''
    const codeText = res.responseCode != null ? `${rule.key || 'code'}=${res.responseCode}` : 'no business code'
    return [
      res.ok || res.sent || res.verified ? `🟢 ${label} SUCCESS (${codeText})` : `🔴 ${label} FAILED (${codeText})`,
      ruleText,
      res.message || res.error || '',
      res.providerRequestId ? `transactionId: ${res.providerRequestId}` : '',
      res.httpStatus != null ? `HTTP: ${res.httpStatus}` : '',
      res.rawResponse ? `Response: ${JSON.stringify(res.rawResponse, null, 2)}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  const handleHealthCheck = async () => {
    setTesting(true)
    setTestResult('')
    try {
      const res = await checkOtpProviderHealth({
        provider: 'partner',
        config: JSON.stringify(partnerConfig),
      })
      if (res.ok) {
        const rule = res.successRule || {}
        setTestResult(`🟢 Health check OK\nSuccess when ${rule.key}=${rule.value}\n${res.message || ''}`)
      } else {
        setTestResult(`🔴 Health check failed: ${res.error || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResult(`🔴 Connection error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleTestSend = async () => {
    if (!testPhone) {
      alert('Please enter a phone number for testing')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await testSendOtp({
        phone: testPhone,
        provider: 'partner',
        config: JSON.stringify(partnerConfig),
        campaignId,
      })
      if (res.providerRequestId) setLastProviderRequestId(res.providerRequestId)
      setTestResult(formatTestResult('SEND', res))
    } catch (err) {
      setTestResult(`🔴 Dispatch error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleTestVerify = async () => {
    if (!testPhone) {
      alert('Please enter a phone number for testing')
      return
    }
    if (!testOtp) {
      alert('Please enter the OTP received on the phone')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await testVerifyOtp({
        phone: testPhone,
        otp: testOtp,
        provider: 'partner',
        config: JSON.stringify(partnerConfig),
        providerRequestId: lastProviderRequestId || undefined,
        campaignId,
      })
      setTestResult(formatTestResult('VERIFY', res))
    } catch (err) {
      setTestResult(`🔴 Verify error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const setHeField = (key, value) => {
    setHeFields((prev) => ({ ...prev, [key]: value }))
  }

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
