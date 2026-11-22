import { useEffect } from 'react'
import {
  applyUniverseDcbGraphLayout,
  normalizeModeId,
  resolveAfterIdentityTarget,
} from '../verificationModes'
import { normalizeStartConfig } from '../startConfig'
import { toRfNodes, toRfEdges } from './builderUtils'

export function useFlowLoader({
  campaignId,
  loadCampaignFlow,
  setLoading,
  setMode,
  setIsLocked,
  setEntryPage,
  setAfterIdentity,
  setStartConfig,
  setNodes,
  setEdges,
}) {
  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      setLoading(true)
      loadCampaignFlow(campaignId)
        .then((res) => {
          if (cancelled) return
          const nextMode = normalizeModeId(res.verificationMode)
          const flowConfig =
            nextMode === 'UNIVERSE_DCB'
              ? applyUniverseDcbGraphLayout(res.flowConfig)
              : res.flowConfig
          const nextStart = normalizeStartConfig(flowConfig?.startConfig, nextMode)
          setMode(nextMode)
          setIsLocked(Boolean(flowConfig?.isLocked ?? (nextMode === 'ORANGE_BF')))
          setEntryPage(flowConfig?.entryPage || 'HOME')
          setAfterIdentity(resolveAfterIdentityTarget(flowConfig))
          setStartConfig(nextStart)
          setNodes(toRfNodes(flowConfig, nextStart, nextMode))
          setEdges(toRfEdges(flowConfig, nextStart, nextMode))
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    campaignId,
    loadCampaignFlow,
    setLoading,
    setMode,
    setIsLocked,
    setEntryPage,
    setAfterIdentity,
    setStartConfig,
    setNodes,
    setEdges,
  ])
}
