import { PAGE_TYPE_LABELS } from '../../../services/api/campaigns'
import {
  normalizeStartConfig,
  stripMetaNodes,
  isMetaNodeId,
} from '../startConfig'

export function validateAndBuildFlowConfig({
  edges = [],
  pageNodes = [],
  mode,
  entryPage,
  startConfig,
  isLocked,
  showApiExpose,
}) {
  const clientErrors = []
  const pageTypes = new Set(pageNodes.map((n) => n.data?.pageType || n.pageType))
  const isApiExpose = Boolean(showApiExpose)

  if (!isApiExpose) {
    if (!pageTypes.has(entryPage)) {
      clientErrors.push(
        `Start page "${PAGE_TYPE_LABELS[entryPage] || entryPage}" must be in the flow.`,
      )
    }
    if (
      (mode === 'OTP_ONLY' || mode === 'BOTH' || mode === 'UNIVERSE_DCB' || mode === 'ORANGE_BF') &&
      !pageTypes.has('OTP')
    ) {
      clientErrors.push(`Verification mode "${mode}" requires an OTP page node.`)
    }

    const entryNode = pageNodes.find((n) => (n.data?.pageType || n.pageType) === entryPage)
    if (entryNode) {
      const reachable = new Set([entryNode.id])
      let changed = true
      while (changed) {
        changed = false
        for (const e of edges) {
          if (isMetaNodeId(e.source) || isMetaNodeId(e.target)) continue
          if (reachable.has(e.source) && !reachable.has(e.target)) {
            reachable.add(e.target)
            changed = true
          }
        }
      }
      const orphans = pageNodes.filter((n) => !reachable.has(n.id))
      if (orphans.length > 0) {
        const labels = orphans.map((n) => n.data?.label || n.label || n.pageType || n.id).join(', ')
        clientErrors.push(
          `Note: "${labels}" not reachable from start page (${PAGE_TYPE_LABELS[entryPage] || entryPage}) and will be removed on save.`,
        )
      }
    }
  }

  const hardErrors = clientErrors.filter((e) => !e.startsWith('Note:'))
  if (hardErrors.length > 0) {
    return { errors: clientErrors, hardErrors, flowConfig: null }
  }

  const rawConfig = isApiExpose
    ? {
        version: 1,
        entryPage: 'API_EXPOSE',
        startConfig: normalizeStartConfig(startConfig, mode),
        nodes: [],
        edges: [],
      }
    : {
        version: 1,
        entryPage: entryPage || 'HOME',
        startConfig: normalizeStartConfig(startConfig, mode),
        nodes: pageNodes.map((n) => ({
          id: n.id,
          pageType: n.data?.pageType || n.pageType,
          position: {
            x: Math.round(n.position?.x ?? 0),
            y: Math.round(n.position?.y ?? 0),
          },
        })),
        edges: edges
          .filter((e) => !isMetaNodeId(e.source) && !isMetaNodeId(e.target))
          .map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            condition: e.data?.condition || e.condition || 'DEFAULT',
          })),
      }

  const flowConfig = {
    ...stripMetaNodes(rawConfig),
    isLocked,
  }

  return { errors: clientErrors, hardErrors: [], flowConfig }
}
