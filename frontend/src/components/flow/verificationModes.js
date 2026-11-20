/**
 * Shared verification-mode definitions + default flow graphs (Layer B).
 *
 * Modularized into:
 *   - ./verification/modes.js (mode definitions and identity predicate helpers)
 *   - ./verification/layouts.js (graph layouts, node positions, and default flows)
 *   - ./verification/summary.js (path summary generation and traversal helpers)
 */

export {
  VERIFICATION_MODES,
  normalizeModeId,
  isNullIdentityMode,
  isLandingCgMode,
  isCgHomeMode,
  isApiExposeEntry,
  isApiExposeCampaign,
  isDcbApiExposeCampaign,
  isOtpApiExposeCampaign,
  normalizeAfterIdentity,
} from './verification/modes'

export {
  OUTCOME_NODES,
  DCB_PAGE_POSITIONS,
  DCB_OUTCOME_NODES,
  applyUniverseDcbGraphLayout,
  flowEdge,
  outcomeEdgesFrom,
  otpBlockErrorEdges,
  DEFAULT_FLOWS,
  buildDefaultFlow,
} from './verification/layouts'

export {
  CONDITION_LABELS,
  resolveEntryPage,
  resolveAfterIdentityTarget,
  resolveAfterOtpTarget,
  buildFlowPathSummary,
} from './verification/summary'
