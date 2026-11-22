import { useEffect, useMemo, useState } from 'react'
import useStore from '../../../../store/useStore'
import {
  testSendOtp,
  testVerifyOtp,
  checkOtpProviderHealth,
} from '../../../../services/api/campaigns'
import { parseDcbConfig, serializeDcbConfig } from '../../dcbConfig'
import {
  DEFAULT_ORANGE_BF_CONFIG,
  DEFAULT_PARTNER,
  DEFAULT_CHECKSUB,
  clampPayoutPercent,
  parseChecksubConfig,
  serializeChecksubConfig,
  EMPTY_HE_FIELDS,
  parseHeConfig,
  buildHeConfigJson,
} from '../common/apiConfigDefaults'

export function useApiConfigForm({ isOpen, onClose, campaignId, mode, availableTabs }) {
  const loadCampaignApiConfig = useStore((s) => s.loadCampaignApiConfig)
  const saveCampaignApiConfig = useStore((s) => s.saveCampaignApiConfig)
  const addToast = useStore((s) => s.addToast)

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
    let active = true
    const timer = setTimeout(() => {
      if (!active) return
      setLoading(true)
      setTestResult('')
      setTestPhone('')
      setTestOtp('')

      const initialTab = mode === 'ORANGE_BF' ? 'orange_bf' : (availableTabs[0]?.id || 'billing')
      setActiveTab(initialTab)

      loadCampaignApiConfig(campaignId)
        .then((config = {}) => {
          if (!active) return
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
        .catch((err) => {
          if (active) addToast(err.message || 'Failed to load API config', 'error')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
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

  return {
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
  }
}
