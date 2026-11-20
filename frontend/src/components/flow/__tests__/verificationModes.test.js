import { describe, it, expect } from 'vitest'
import {
  normalizeModeId,
  isNullIdentityMode,
  isLandingCgMode,
  isCgHomeMode,
  isApiExposeEntry,
  isApiExposeCampaign,
  isDcbApiExposeCampaign,
  isOtpApiExposeCampaign,
  normalizeAfterIdentity,
  buildDefaultFlow,
  resolveAfterIdentityTarget,
  resolveAfterOtpTarget,
  buildFlowPathSummary,
  applyUniverseDcbGraphLayout,
  VERIFICATION_MODES,
} from '../verificationModes'

describe('verificationModes logic & defaults', () => {
  it('correctly normalizes mode IDs', () => {
    expect(normalizeModeId('MSISDN_ONLY')).toBe('HEADER_INJECTION')
    expect(normalizeModeId('NULL')).toBe('BOTH')
    expect(normalizeModeId(null)).toBe('BOTH')
    expect(normalizeModeId(undefined)).toBe('BOTH')
    expect(normalizeModeId('')).toBe('BOTH')
    expect(normalizeModeId('OTP_ONLY')).toBe('OTP_ONLY')
    expect(normalizeModeId('UNIVERSE_DCB')).toBe('UNIVERSE_DCB')
    expect(normalizeModeId('ORANGE_BF')).toBe('ORANGE_BF')
  })

  it('checks null identity and landing CG modes', () => {
    expect(isNullIdentityMode('NONE')).toBe(true)
    expect(isNullIdentityMode('CG_HOME')).toBe(true)
    expect(isNullIdentityMode('BOTH')).toBe(false)
    expect(isLandingCgMode('NONE')).toBe(true)
    expect(isLandingCgMode('CG_HOME')).toBe(false)
    expect(isCgHomeMode('CG_HOME')).toBe(true)
    expect(isCgHomeMode('NONE')).toBe(false)
  })

  it('checks api expose entries and campaign predicates', () => {
    expect(isApiExposeEntry('API_EXPOSE')).toBe(true)
    expect(isApiExposeEntry('api_expose')).toBe(true)
    expect(isApiExposeEntry('HOME')).toBe(false)
    expect(isApiExposeEntry(null)).toBe(false)

    const dcbApiCamp = {
      verificationMode: 'UNIVERSE_DCB',
      flowConfig: { entryPage: 'API_EXPOSE' },
    }
    expect(isApiExposeCampaign(dcbApiCamp)).toBe(true)
    expect(isDcbApiExposeCampaign(dcbApiCamp)).toBe(true)
    expect(isOtpApiExposeCampaign(dcbApiCamp)).toBe(false)

    const otpApiCamp = {
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'API_EXPOSE' },
    }
    expect(isApiExposeCampaign(otpApiCamp)).toBe(true)
    expect(isDcbApiExposeCampaign(otpApiCamp)).toBe(false)
    expect(isOtpApiExposeCampaign(otpApiCamp)).toBe(true)

    const regularCamp = {
      verificationMode: 'BOTH',
      flowConfig: { entryPage: 'HOME' },
    }
    expect(isApiExposeCampaign(regularCamp)).toBe(false)
  })

  it('normalizes afterIdentity parameter', () => {
    expect(normalizeAfterIdentity('THANKYOU')).toBe('THANKYOU')
    expect(normalizeAfterIdentity('HOME')).toBe('HOME')
    expect(normalizeAfterIdentity('CONFIRM')).toBe('HOME')
    expect(normalizeAfterIdentity('UNKNOWN')).toBe('HOME')
    expect(normalizeAfterIdentity(undefined, 'THANKYOU')).toBe('THANKYOU')
  })

  it('builds default flows for HEADER_INJECTION and BOTH', () => {
    const heFlow = buildDefaultFlow('HEADER_INJECTION')
    expect(heFlow.entryPage).toBe('HOME')
    expect(heFlow.nodes.some((n) => n.id === 'HOME')).toBe(true)
    expect(heFlow.nodes.some((n) => n.id === 'THANKYOU')).toBe(true)

    const bothFlow = buildDefaultFlow('BOTH')
    expect(bothFlow.entryPage).toBe('HOME')
    expect(bothFlow.nodes.some((n) => n.id === 'OTP')).toBe(true)
  })

  it('builds default flow for OTP_ONLY with API_EXPOSE entry', () => {
    const apiFlow = buildDefaultFlow('OTP_ONLY', { entryPage: 'API_EXPOSE' })
    expect(apiFlow.entryPage).toBe('API_EXPOSE')
    expect(apiFlow.nodes.length).toBe(0)
    expect(apiFlow.edges.length).toBe(0)
  })

  it('builds default flow for UNIVERSE_DCB and ORANGE_BF', () => {
    const dcbFlow = buildDefaultFlow('UNIVERSE_DCB')
    expect(dcbFlow.entryPage).toBe('OTP')
    expect(dcbFlow.nodes.some((n) => n.id === 'HOME')).toBe(true)

    const bfFlow = buildDefaultFlow('ORANGE_BF')
    expect(bfFlow.entryPage).toBe('HOME')
    expect(bfFlow.nodes.some((n) => n.id === 'CONFIRM')).toBe(true)
    const bfMeta = VERIFICATION_MODES.find((m) => m.id === 'ORANGE_BF')
    expect(bfMeta?.isLocked).toBe(true)
  })

  it('resolves after-identity target from edges and nodes', () => {
    const flow1 = {
      edges: [{ source: 'OTP', condition: 'OTP_VERIFIED', target: 'THANKYOU' }],
    }
    expect(resolveAfterIdentityTarget(flow1)).toBe('THANKYOU')
    expect(resolveAfterOtpTarget(flow1)).toBe('THANKYOU')

    const flow2 = {
      edges: [{ source: 'HOME', condition: 'HEADER_RESOLVED', target: 'HOME' }],
    }
    expect(resolveAfterIdentityTarget(flow2)).toBe('HOME')

    const flowConfirm = {
      edges: [],
      nodes: [{ id: 'CONFIRM', pageType: 'CONFIRM' }],
    }
    expect(resolveAfterIdentityTarget(flowConfirm)).toBe('CONFIRM')
  })

  it('applies universe DCB graph layout correctly', () => {
    const rawFlow = {
      entryPage: 'otp',
      nodes: [
        { id: 'OTP', pageType: 'OTP', position: { x: 0, y: 0 } },
        { id: 'HOME', pageType: 'HOME', position: { x: 0, y: 0 } },
      ],
    }
    const laidOut = applyUniverseDcbGraphLayout(rawFlow)
    expect(laidOut.nodes[0].position.x).toBe(300)
    expect(laidOut.nodes[1].position.x).toBe(620)
  })

  it('builds path summary correctly for various modes', () => {
    const heSummary = buildFlowPathSummary('HEADER_INJECTION')
    expect(heSummary.mode).toBe('HEADER_INJECTION')
    expect(heSummary.entryPage).toBe('HOME')
    expect(heSummary.steps.length).toBeGreaterThan(0)

    const dcbApiSummary = buildFlowPathSummary('UNIVERSE_DCB', { entryPage: 'API_EXPOSE' })
    expect(dcbApiSummary.entryPage).toBe('API_EXPOSE')
    expect(dcbApiSummary.steps.length).toBe(3)

    const cgSummary = buildFlowPathSummary('NONE', {}, { cgRedirectUrl: 'https://cg.example.com' })
    expect(cgSummary.entryPage).toBe('HOME')
    expect(cgSummary.steps[0].id).toBe('land')
    expect(cgSummary.steps[1].id).toBe('cg')
  })
})
