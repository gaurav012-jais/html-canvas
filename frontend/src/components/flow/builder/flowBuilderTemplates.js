import { useCallback } from 'react'
import {
  buildDefaultFlow,
  isApiExposeEntry,
  resolveAfterIdentityTarget,
} from '../verificationModes'
import { defaultStartConfig } from '../startConfig'
import { toRfNodes, toRfEdges } from './builderUtils'

export function useFlowBuilderTemplates({
  mode,
  setMode,
  entryPage,
  setEntryPage,
  afterIdentity,
  setAfterIdentity,
  isLocked,
  setStartConfig,
  setNodes,
  setEdges,
  setErrors,
  addToast,
  campaignId,
  applyCampaignDefaults,
  setResettingPages,
}) {
  const applyFlowTemplate = useCallback(
    (nextMode, nextEntry, nextAfter) => {
      const def = buildDefaultFlow(nextMode, {
        entryPage:
          nextMode === 'OTP_ONLY' || nextMode === 'UNIVERSE_DCB'
            ? nextEntry
            : 'HOME',
        afterIdentity: isApiExposeEntry(nextEntry) ? 'HOME' : nextAfter,
      })
      const nextStart = defaultStartConfig(nextMode)
      setStartConfig(nextStart)
      setNodes(toRfNodes(def, nextStart, nextMode))
      setEdges(toRfEdges(def, nextStart, nextMode))
      setEntryPage(def.entryPage || 'HOME')
      setAfterIdentity(resolveAfterIdentityTarget(def))
      setErrors([])
    },
    [setNodes, setEdges, setStartConfig, setEntryPage, setAfterIdentity, setErrors],
  )

  const handleResetFlow = useCallback(() => {
    if (isLocked) return
    applyFlowTemplate(mode, entryPage, afterIdentity)
    addToast('Flow graph reset to default template', 'success')
  }, [mode, entryPage, afterIdentity, applyFlowTemplate, addToast, isLocked])

  const handleResetPages = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all campaign pages to their default templates? Your clicks, vendor tracking, and traffic logs will NOT be deleted.',
      )
    ) {
      return
    }
    setResettingPages(true)
    try {
      await applyCampaignDefaults(campaignId)
      addToast('Pages reset to default templates successfully', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to reset pages', 'error')
    } finally {
      setResettingPages(false)
    }
  }, [campaignId, applyCampaignDefaults, addToast, setResettingPages])

  const handleModeChange = useCallback(
    (newMode) => {
      if (isLocked) return
      setMode(newMode)
      applyFlowTemplate(
        newMode,
        newMode === 'OTP_ONLY' || newMode === 'UNIVERSE_DCB' ? 'OTP' : 'HOME',
        'HOME',
      )
    },
    [applyFlowTemplate, isLocked, setMode],
  )

  const handleEntryPageChange = useCallback(
    (nextEntry) => {
      if (isLocked) return
      const next = String(nextEntry || 'HOME').toUpperCase()
      setEntryPage(next)
      if (mode === 'OTP_ONLY' || mode === 'UNIVERSE_DCB') {
        applyFlowTemplate(mode, next, afterIdentity)
      }
    },
    [mode, afterIdentity, applyFlowTemplate, isLocked, setEntryPage],
  )

  const handleAfterIdentityChange = useCallback(
    (nextAfter) => {
      if (isLocked) return
      const next = String(nextAfter || 'HOME').toUpperCase()
      setAfterIdentity(next)
      if (!isApiExposeEntry(entryPage)) {
        applyFlowTemplate(mode, entryPage, next)
      }
    },
    [mode, entryPage, applyFlowTemplate, isLocked, setAfterIdentity],
  )

  return {
    applyFlowTemplate,
    handleResetFlow,
    handleResetPages,
    handleModeChange,
    handleEntryPageChange,
    handleAfterIdentityChange,
  }
}
