import { describe, it, expect } from 'vitest'
import {
  DEFAULT_DCB_CONFIG,
  CLASSIC_PACK_OPTIONS,
  parseDcbConfig,
  serializeDcbConfig,
  previewPincodePayload,
  previewConfirmPayload,
  editorPackOptions,
  buildDcbApiGuide,
  joinUrl,
} from '../dcbConfig'

describe('dcbConfig facade and submodules', () => {
  it('parses empty or partial config gracefully using defaults', () => {
    const config = parseDcbConfig(null)
    expect(config.baseUrl).toBe(DEFAULT_DCB_CONFIG.baseUrl)
    expect(config.merchantId).toBe(DEFAULT_DCB_CONFIG.merchantId)
    expect(config.purchaseTypeMappings.length).toBeGreaterThan(0)
  })

  it('serializes and parses DCB config round-trip', () => {
    const raw = {
      baseUrl: 'https://example.com/api',
      merchantId: '999',
      serviceId: '123',
      operatorCode: 'TEST',
      purchaseTypeMappings: [
        { packKey: 'daily', label: 'Daily Pack', purchaseTypeId: '5' },
      ],
    }
    const json = serializeDcbConfig(raw)
    const back = parseDcbConfig(json)

    expect(back.baseUrl).toBe('https://example.com/api')
    expect(back.merchantId).toBe('999')
    expect(back.serviceId).toBe('123')
    expect(back.purchaseTypeMappings).toHaveLength(1)
    expect(back.purchaseTypeMappings[0].purchaseTypeId).toBe('5')
  })

  it('generates valid pincode and confirm payloads', () => {
    const pinPayload = previewPincodePayload(null)
    expect(pinPayload.merchantId).toBe(169)
    expect(pinPayload.serviceId).toBe(581)
    expect(pinPayload.msisdn).toBe('566891023')

    const confirmPayload = previewConfirmPayload(null)
    expect(confirmPayload.id).toBe('REQUEST-ID-FROM-PIN-RESPONSE')
    expect(confirmPayload.pinCode).toBe('1234')
  })

  it('formats URLs correctly with joinUrl', () => {
    expect(joinUrl('https://example.com/', '/api/test')).toBe('https://example.com/api/test')
    expect(joinUrl('https://example.com', 'api/test')).toBe('https://example.com/api/test')
    expect(joinUrl('https://example.com', 'https://other.com/foo')).toBe('https://other.com/foo')
  })

  it('resolves editor pack options based on universe DCB mode', () => {
    const classic = editorPackOptions(null, { universeDcb: false })
    expect(classic).toEqual(CLASSIC_PACK_OPTIONS)

    const universe = editorPackOptions(null, { universeDcb: true })
    expect(universe.length).toBeGreaterThan(0)
    expect(universe[0].purchaseTypeId).toBeTruthy()
  })

  it('generates markdown DCB API documentation guide', () => {
    const guide = buildDcbApiGuide(null)
    expect(guide).toContain('# Universe Telecom DCB API Specification')
    expect(guide).toContain('Merchant ID')
    expect(guide).toContain('Request a Subscription PIN')
  })
})
