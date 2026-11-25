import { useCallback, useEffect, useState } from 'react'
import useStore from '../../../store/useStore'
import {
  getCacheStats,
  clearCache,
  listCacheKeys,
  deleteCacheKey,
} from '../../../services/api/admin'

export function useCacheManagement() {
  const addToast = useStore((s) => s.addToast)

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [purgingScope, setPurgingScope] = useState(null)

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    scope: '',
    title: '',
    description: '',
    pattern: '',
    destructive: false,
  })

  const [scanPattern, setScanPattern] = useState('*')
  const [keysList, setKeysList] = useState([])
  const [loadingKeys, setLoadingKeys] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const data = await getCacheStats()
      setStats(data)
    } catch (err) {
      addToast(err.message || 'Failed to fetch cache telemetry', 'error')
    } finally {
      setLoadingStats(false)
    }
  }, [addToast])

  const fetchKeys = useCallback(
    async (patternToScan = '*') => {
      const pattern = String(patternToScan || '*').trim() || '*'
      setLoadingKeys(true)
      try {
        const data = await listCacheKeys({ pattern, limit: 100 })
        setKeysList(Array.isArray(data) ? data : data?.keys || [])
      } catch (err) {
        addToast(err.message || 'Failed to list cache keys', 'error')
      } finally {
        setLoadingKeys(false)
      }
    },
    [addToast],
  )

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      if (active) {
        fetchStats()
        fetchKeys('*')
      }
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fetchStats, fetchKeys])

  const handleOpenPurgeScope = (scope) => {
    setConfirmModal({
      isOpen: true,
      scope: scope.id,
      title: `Purge ${scope.title}`,
      description: `Are you sure you want to purge all keys matching pattern "${scope.pattern}"?`,
      pattern: scope.pattern,
      destructive: false,
    })
  }

  const handleOpenFlushAll = () => {
    setConfirmModal({
      isOpen: true,
      scope: 'all',
      title: 'Danger: Full Cache Flush',
      description: 'Are you sure you want to flush ALL Redis keys across all scopes?',
      pattern: '*',
      destructive: true,
    })
  }

  const handleExecutePurge = async () => {
    const scopeToPurge = confirmModal.scope
    setPurgingScope(scopeToPurge)
    try {
      await clearCache({
        scope: scopeToPurge,
        pattern: scopeToPurge === 'custom' ? confirmModal.pattern : '',
      })
      addToast(
        scopeToPurge === 'all'
          ? 'Entire cache flushed successfully'
          : `Cache for "${scopeToPurge}" purged successfully`,
        'success',
      )
      setConfirmModal((prev) => ({ ...prev, isOpen: false }))
      await Promise.all([fetchStats(), fetchKeys(scanPattern)])
    } catch (err) {
      addToast(err.message || 'Failed to clear cache', 'error')
    } finally {
      setPurgingScope(null)
    }
  }

  const handleDeleteSingleKey = async (key) => {
    if (!window.confirm(`Delete key "${key}" from Redis?`)) return
    try {
      await deleteCacheKey(key)
      addToast(`Deleted key: ${key}`, 'success')
      setKeysList((prev) => prev.filter((k) => k.key !== key))
      fetchStats()
    } catch (err) {
      addToast(err.message || 'Failed to delete cache key', 'error')
    }
  }

  return {
    stats,
    loadingStats,
    purgingScope,
    confirmModal,
    scanPattern,
    keysList,
    loadingKeys,
    setScanPattern,
    setConfirmModal,
    fetchStats,
    fetchKeys,
    handleOpenPurgeScope,
    handleOpenFlushAll,
    handleExecutePurge,
    handleDeleteSingleKey,
  }
}
