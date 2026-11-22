import { describe, it, expect } from 'vitest'
import { validateAndBuildFlowConfig } from '../flowBuilderConfig'

describe('validateAndBuildFlowConfig', () => {
  it('returns hard error when start page is missing from flow', () => {
    const nodeA = { id: 'OTP', pageType: 'OTP', data: { pageType: 'OTP' }, position: { x: 0, y: 0 } }
    const res = validateAndBuildFlowConfig({
      nodes: [nodeA],
      edges: [],
      pageNodes: [nodeA],
      mode: 'OTP_ONLY',
      entryPage: 'HOME',
      startConfig: {},
      isLocked: false,
      showApiExpose: false,
    })
    expect(res.hardErrors.some((e) => e.includes('must be in the flow'))).toBe(true)
    expect(res.flowConfig).toBeNull()
  })

  it('returns hard error when OTP node is required but missing', () => {
    const nodeA = { id: 'HOME', pageType: 'HOME', data: { pageType: 'HOME' }, position: { x: 0, y: 0 } }
    const nodeB = { id: 'CONFIRM', pageType: 'CONFIRM', data: { pageType: 'CONFIRM' }, position: { x: 100, y: 100 } }
    const res = validateAndBuildFlowConfig({
      nodes: [nodeA, nodeB],
      edges: [{ id: 'e1', source: 'HOME', target: 'CONFIRM', data: { condition: 'DEFAULT' } }],
      pageNodes: [nodeA, nodeB],
      mode: 'BOTH',
      entryPage: 'HOME',
      startConfig: {},
      isLocked: false,
      showApiExpose: false,
    })
    expect(res.hardErrors.some((e) => e.includes('requires an OTP page node'))).toBe(true)
    expect(res.flowConfig).toBeNull()
  })

  it('adds a Note warning for orphan unreachable pages but does not set hardErrors', () => {
    const nodeHome = { id: 'HOME', pageType: 'HOME', data: { pageType: 'HOME' }, position: { x: 0, y: 0 } }
    const nodeOtp = { id: 'OTP', pageType: 'OTP', data: { pageType: 'OTP' }, position: { x: 100, y: 100 } }
    const nodeOrphan = { id: 'CONFIRM', pageType: 'CONFIRM', data: { pageType: 'CONFIRM', label: 'Confirm' }, position: { x: 200, y: 200 } }

    const res = validateAndBuildFlowConfig({
      nodes: [nodeHome, nodeOtp, nodeOrphan],
      edges: [{ id: 'e1', source: 'HOME', target: 'OTP', data: { condition: 'DEFAULT' } }],
      pageNodes: [nodeHome, nodeOtp, nodeOrphan],
      mode: 'BOTH',
      entryPage: 'HOME',
      startConfig: {},
      isLocked: false,
      showApiExpose: false,
    })
    expect(res.hardErrors).toHaveLength(0)
    expect(res.errors.some((e) => e.startsWith('Note:') && e.includes('not reachable'))).toBe(true)
    expect(res.flowConfig).toBeDefined()
  })

  it('builds valid flowConfig when pages are properly connected', () => {
    const nodeHome = { id: 'HOME', pageType: 'HOME', data: { pageType: 'HOME' }, position: { x: 10, y: 20 } }
    const nodeOtp = { id: 'OTP', pageType: 'OTP', data: { pageType: 'OTP' }, position: { x: 100, y: 200 } }
    const res = validateAndBuildFlowConfig({
      nodes: [nodeHome, nodeOtp],
      edges: [
        { id: 'e1', source: 'HOME', target: 'OTP', data: { condition: 'DEFAULT' } },
      ],
      pageNodes: [nodeHome, nodeOtp],
      mode: 'BOTH',
      entryPage: 'HOME',
      startConfig: {},
      isLocked: false,
      showApiExpose: false,
    })
    expect(res.hardErrors).toHaveLength(0)
    expect(res.flowConfig).toBeDefined()
    expect(res.flowConfig.nodes).toHaveLength(2)
    expect(res.flowConfig.edges).toHaveLength(1)
    expect(res.flowConfig.entryPage).toBe('HOME')
  })

  it('handles API expose mode with empty nodes and edges gracefully', () => {
    const res = validateAndBuildFlowConfig({
      nodes: [],
      edges: [],
      pageNodes: [],
      mode: 'OTP_ONLY',
      entryPage: 'API_EXPOSE',
      startConfig: {},
      isLocked: false,
      showApiExpose: true,
    })
    expect(res.hardErrors).toHaveLength(0)
    expect(res.flowConfig.entryPage).toBe('API_EXPOSE')
  })
})
