/**
 * Default flow graphs and layout definitions for verification modes.
 */

import { defaultStartConfig } from '../startConfig'
import { normalizeModeId, normalizeAfterIdentity } from './modes'

export const OUTCOME_NODES = [
  { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 40 } },
  { id: 'INPROGRESS', pageType: 'INPROGRESS', position: { x: 880, y: 160 } },
  { id: 'LOW_BALANCE', pageType: 'LOW_BALANCE', position: { x: 880, y: 280 } },
  { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 880, y: 400 } },
  { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 520 } },
]

export const DCB_PAGE_POSITIONS = {
  OTP: { x: 300, y: 48 },
  HOME: { x: 620, y: 48 },
  INPROGRESS: { x: 940, y: 48 },
  THANKYOU: { x: 1220, y: 48 },
  LOW_BALANCE: { x: 940, y: 200 },
  BLOCKED: { x: 940, y: 340 },
  ERROR: { x: 940, y: 480 },
}

export const DCB_OUTCOME_NODES = [
  { id: 'THANKYOU', pageType: 'THANKYOU', position: { ...DCB_PAGE_POSITIONS.THANKYOU } },
  { id: 'INPROGRESS', pageType: 'INPROGRESS', position: { ...DCB_PAGE_POSITIONS.INPROGRESS } },
  { id: 'LOW_BALANCE', pageType: 'LOW_BALANCE', position: { ...DCB_PAGE_POSITIONS.LOW_BALANCE } },
  { id: 'BLOCKED', pageType: 'BLOCKED', position: { ...DCB_PAGE_POSITIONS.BLOCKED } },
  { id: 'ERROR', pageType: 'ERROR', position: { ...DCB_PAGE_POSITIONS.ERROR } },
]

/** Left-to-right wifi path: number → packs → PIN (same OTP page) → polling. */
export function applyUniverseDcbGraphLayout(flowConfig) {
  if (!flowConfig) return flowConfig
  const nodes = (flowConfig.nodes || []).map((node) => {
    const position = DCB_PAGE_POSITIONS[node.pageType]
    return position ? { ...node, position: { ...position } } : node
  })
  const savedEntry = String(flowConfig.entryPage || '').toUpperCase()
  const entryPage = savedEntry === 'API_EXPOSE' ? 'API_EXPOSE' : savedEntry || 'OTP'
  return { ...flowConfig, entryPage, nodes }
}

export function flowEdge(source, target, condition) {
  return {
    id: `${source}-${condition}-${target}`,
    source,
    target,
    condition,
  }
}

export function outcomeEdgesFrom(source) {
  return [
    flowEdge(source, 'THANKYOU', 'SUBSCRIBED'),
    flowEdge(source, 'INPROGRESS', 'PENDING'),
    flowEdge(source, 'LOW_BALANCE', 'LOW_BALANCE'),
    flowEdge(source, 'BLOCKED', 'BLOCKED'),
    flowEdge(source, 'ERROR', 'ERROR'),
  ]
}

export function otpBlockErrorEdges() {
  return [flowEdge('OTP', 'BLOCKED', 'BLOCKED'), flowEdge('OTP', 'ERROR', 'ERROR')]
}

/** Default flowConfig graphs — HOME is the subscribe canvas (no Confirm). */
export const DEFAULT_FLOWS = {
  HEADER_INJECTION: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }, ...OUTCOME_NODES],
    edges: [flowEdge('HOME', 'ERROR', 'HEADER_UNRESOLVED'), ...outcomeEdgesFrom('HOME')],
  },
  OTP_ONLY: {
    entryPage: 'OTP',
    nodes: [
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      ...OUTCOME_NODES,
    ],
    edges: [flowEdge('OTP', 'HOME', 'OTP_VERIFIED'), ...outcomeEdgesFrom('HOME')],
  },
  BOTH: {
    entryPage: 'HOME',
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
      ...OUTCOME_NODES,
    ],
    edges: [
      flowEdge('HOME', 'OTP', 'HEADER_UNRESOLVED'),
      flowEdge('OTP', 'HOME', 'OTP_VERIFIED'),
      ...outcomeEdgesFrom('HOME'),
    ],
  },
  UNIVERSE_DCB: {
    entryPage: 'OTP',
    nodes: [
      { id: 'OTP', pageType: 'OTP', position: { ...DCB_PAGE_POSITIONS.OTP } },
      { id: 'HOME', pageType: 'HOME', position: { ...DCB_PAGE_POSITIONS.HOME } },
      ...DCB_OUTCOME_NODES,
    ],
    edges: [
      flowEdge('OTP', 'HOME', 'MSISDN_CHECKED'),
      flowEdge('HOME', 'OTP', 'PIN_REQUESTED'),
      flowEdge('HOME', 'LOW_BALANCE', 'LOW_BALANCE'),
      flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
      flowEdge('HOME', 'ERROR', 'ERROR'),
      flowEdge('OTP', 'INPROGRESS', 'PIN_CONFIRMED'),
      flowEdge('INPROGRESS', 'THANKYOU', 'ACTIVATED'),
      flowEdge('INPROGRESS', 'LOW_BALANCE', 'LOW_BALANCE'),
      flowEdge('INPROGRESS', 'ERROR', 'ERROR'),
    ],
  },
  ORANGE_BF: {
    entryPage: 'HOME',
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 200, y: 180 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 460, y: 180 } },
      { id: 'OTP', pageType: 'OTP', position: { x: 720, y: 180 } },
      { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 980, y: 180 } },
      { id: 'BLOCKED', pageType: 'BLOCKED', position: { x: 980, y: 300 } },
      { id: 'ERROR', pageType: 'ERROR', position: { x: 980, y: 420 } },
    ],
    edges: [
      flowEdge('HOME', 'CONFIRM', 'SUBSCRIBE'),
      flowEdge('CONFIRM', 'OTP', 'OTP_SENT'),
      flowEdge('CONFIRM', 'OTP', 'DEFAULT'),
      flowEdge('CONFIRM', 'THANKYOU', 'ACTIVE_SUBSCRIBER'),
      flowEdge('OTP', 'THANKYOU', 'OTP_VERIFIED'),
      flowEdge('OTP', 'BLOCKED', 'BLOCKED'),
      flowEdge('OTP', 'ERROR', 'ERROR'),
    ],
  },
  NONE: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
    edges: [],
  },
  CG_HOME: {
    entryPage: 'HOME',
    nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
    edges: [],
  },
}

/**
 * Build default flow for a mode.
 *   entryPage 'HOME' | 'OTP' | 'API_EXPOSE' (OTP_ONLY landing)
 *   afterIdentity / afterOtp 'HOME' | 'THANKYOU'
 */
export function buildDefaultFlow(mode, { entryPage, afterIdentity, afterOtp } = {}) {
  const normalized = normalizeModeId(mode)
  const skipHome = normalizeAfterIdentity(afterIdentity, afterOtp) === 'THANKYOU'
  const entry = String(entryPage || '').toUpperCase()
  const otpEntry = entry === 'OTP' || (normalized === 'OTP_ONLY' && !entry)
  const apiExpose = entry === 'API_EXPOSE'

  if (normalized === 'NONE' || normalized === 'CG_HOME') {
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig(normalized),
      nodes: [{ id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }],
      edges: [],
    }
  }

  if (normalized === 'OTP_ONLY' && apiExpose) {
    return {
      version: 1,
      entryPage: 'API_EXPOSE',
      startConfig: defaultStartConfig('OTP_ONLY'),
      nodes: [],
      edges: [],
    }
  }

  const outcomes = OUTCOME_NODES.map((n) => ({ ...n }))
  const homeNode = { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } }
  const otpNode = { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } }

  if (normalized === 'OTP_ONLY') {
    const afterOtpTarget = skipHome ? 'THANKYOU' : 'HOME'
    if (skipHome && otpEntry) {
      return {
        version: 1,
        entryPage: 'OTP',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [otpNode, ...outcomes.filter((n) => n.id !== 'INPROGRESS' && n.id !== 'LOW_BALANCE')],
        edges: [flowEdge('OTP', 'THANKYOU', 'OTP_VERIFIED'), ...otpBlockErrorEdges()],
      }
    }
    if (skipHome) {
      return {
        version: 1,
        entryPage: 'HOME',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [homeNode, otpNode, ...outcomes.filter((n) => n.id !== 'INPROGRESS' && n.id !== 'LOW_BALANCE')],
        edges: [
          flowEdge('HOME', 'OTP', 'DEFAULT'),
          flowEdge('OTP', 'THANKYOU', 'OTP_VERIFIED'),
          ...otpBlockErrorEdges(),
          flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
        ],
      }
    }
    if (otpEntry) {
      return {
        version: 1,
        entryPage: 'OTP',
        startConfig: defaultStartConfig('OTP_ONLY'),
        nodes: [otpNode, homeNode, ...outcomes],
        edges: [flowEdge('OTP', afterOtpTarget, 'OTP_VERIFIED'), ...outcomeEdgesFrom('HOME'), ...otpBlockErrorEdges()],
      }
    }
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig('OTP_ONLY'),
      nodes: [homeNode, otpNode, ...outcomes],
      edges: [
        flowEdge('HOME', 'OTP', 'DEFAULT'),
        flowEdge('OTP', afterOtpTarget, 'OTP_VERIFIED'),
        ...outcomeEdgesFrom('HOME'),
        ...otpBlockErrorEdges(),
        flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
      ],
    }
  }

  if (normalized === 'HEADER_INJECTION') {
    const edges = [flowEdge('HOME', 'ERROR', 'HEADER_UNRESOLVED'), ...outcomeEdgesFrom('HOME')]
    if (skipHome) {
      edges.unshift(flowEdge('HOME', 'THANKYOU', 'HEADER_RESOLVED'))
    }
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig('HEADER_INJECTION'),
      nodes: [homeNode, ...outcomes],
      edges,
    }
  }

  if (normalized === 'BOTH') {
    const afterTarget = skipHome ? 'THANKYOU' : 'HOME'
    const edges = [
      flowEdge('HOME', 'OTP', 'HEADER_UNRESOLVED'),
      flowEdge('OTP', afterTarget, 'OTP_VERIFIED'),
      ...otpBlockErrorEdges(),
      ...outcomeEdgesFrom('HOME'),
    ]
    if (skipHome) {
      edges.unshift(flowEdge('HOME', 'THANKYOU', 'HEADER_RESOLVED'))
    }
    return {
      version: 1,
      entryPage: 'HOME',
      startConfig: defaultStartConfig('BOTH'),
      nodes: [homeNode, otpNode, ...outcomes],
      edges,
    }
  }

  if (normalized === 'UNIVERSE_DCB') {
    if (apiExpose) {
      return {
        version: 1,
        entryPage: 'API_EXPOSE',
        startConfig: defaultStartConfig('UNIVERSE_DCB'),
        nodes: [],
        edges: [],
      }
    }
    return {
      version: 1,
      entryPage: 'OTP',
      startConfig: defaultStartConfig('UNIVERSE_DCB'),
      nodes: [
        { ...otpNode, position: { ...DCB_PAGE_POSITIONS.OTP } },
        { ...homeNode, position: { ...DCB_PAGE_POSITIONS.HOME } },
        ...DCB_OUTCOME_NODES.map((node) => ({ ...node })),
      ],
      edges: [
        flowEdge('OTP', 'HOME', 'MSISDN_CHECKED'),
        flowEdge('HOME', 'OTP', 'PIN_REQUESTED'),
        flowEdge('HOME', 'LOW_BALANCE', 'LOW_BALANCE'),
        flowEdge('HOME', 'BLOCKED', 'BLOCKED'),
        flowEdge('HOME', 'ERROR', 'ERROR'),
        flowEdge('OTP', 'INPROGRESS', 'PIN_CONFIRMED'),
        flowEdge('INPROGRESS', 'THANKYOU', 'ACTIVATED'),
        flowEdge('INPROGRESS', 'LOW_BALANCE', 'LOW_BALANCE'),
        flowEdge('INPROGRESS', 'ERROR', 'ERROR'),
      ],
    }
  }

  const base = DEFAULT_FLOWS[normalized] || DEFAULT_FLOWS.BOTH
  return {
    version: 1,
    entryPage: base.entryPage || 'HOME',
    startConfig: defaultStartConfig(normalized),
    nodes: base.nodes.map((n) => ({ ...n })),
    edges: base.edges.map((e) => ({ ...e })),
  }
}
