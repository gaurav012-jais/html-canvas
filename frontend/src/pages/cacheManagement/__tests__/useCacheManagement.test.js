import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCacheManagement } from '../hooks/useCacheManagement'

const {
  mockAddToast,
  mockGetCacheStats,
  mockClearCache,
  mockListCacheKeys,
  mockDeleteCacheKey,
} = vi.hoisted(() => ({
  mockAddToast: vi.fn(),
  mockGetCacheStats: vi.fn(),
  mockClearCache: vi.fn(),
  mockListCacheKeys: vi.fn(),
  mockDeleteCacheKey: vi.fn(),
}))

vi.mock('../../../store/useStore', () => ({
  default: (selector) => selector({ addToast: mockAddToast }),
}))

vi.mock('../../../services/api/admin', () => ({
  getCacheStats: mockGetCacheStats,
  clearCache: mockClearCache,
  listCacheKeys: mockListCacheKeys,
  deleteCacheKey: mockDeleteCacheKey,
}))

describe('useCacheManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCacheStats.mockResolvedValue({ status: 'ready', totalKeys: 12 })
    mockListCacheKeys.mockResolvedValue({ keys: [{ key: 'flow:1', ttl: 300 }] })
    mockClearCache.mockResolvedValue({ cleared: 4 })
  })

  it('fetches stats and passes object params to listCacheKeys on mount', async () => {
    const { result } = renderHook(() => useCacheManagement())

    await waitFor(() => {
      expect(mockGetCacheStats).toHaveBeenCalledTimes(1)
      expect(mockListCacheKeys).toHaveBeenCalledWith({ pattern: '*', limit: 100 })
      expect(result.current.keysList).toEqual([{ key: 'flow:1', ttl: 300 }])
    })
  })

  it('does not refetch keys on every scanPattern keystroke change', async () => {
    const { result } = renderHook(() => useCacheManagement())

    await waitFor(() => {
      expect(mockListCacheKeys).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.setScanPattern('campaign:*')
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(mockListCacheKeys).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.fetchKeys('campaign:*')
    })

    expect(mockListCacheKeys).toHaveBeenCalledTimes(2)
    expect(mockListCacheKeys).toHaveBeenLastCalledWith({ pattern: 'campaign:*', limit: 100 })
  })

  it('calls clearCache with structured { scope, pattern } payload on purge', async () => {
    const { result } = renderHook(() => useCacheManagement())

    await waitFor(() => {
      expect(mockGetCacheStats).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.handleOpenPurgeScope({
        id: 'flow',
        title: 'Flow Engine',
        pattern: 'flow:*',
      })
    })

    await act(async () => {
      await result.current.handleExecutePurge()
    })

    expect(mockClearCache).toHaveBeenCalledWith({ scope: 'flow', pattern: '' })

    act(() => {
      result.current.setConfirmModal({
        isOpen: true,
        scope: 'custom',
        title: 'Custom',
        description: '',
        pattern: 'otp:42:*',
        destructive: false,
      })
    })

    await act(async () => {
      await result.current.handleExecutePurge()
    })

    expect(mockClearCache).toHaveBeenLastCalledWith({
      scope: 'custom',
      pattern: 'otp:42:*',
    })
  })
})
