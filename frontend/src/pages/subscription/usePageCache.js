import { useCallback, useEffect } from 'react'
import { prefetchFlowPage } from '../../services/api/flow'
import { FLOW_FONT, FLOW_PAGE_CACHE_ENABLED, PRELOAD_BY_PAGE } from './constants'

export function usePageCache({
  country,
  operator,
  campid,
  trackingCampid,
  vid,
  affId,
  phoneRef,
  visitIdRef,
  clickIdRef,
  rcidRef,
  pageCacheRef,
  prefetchingRef,
  pageData,
}) {
  useEffect(() => {
    const existing = document.querySelector('link[data-flow-font]')
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = FLOW_FONT
      link.dataset.flowFont = 'true'
      document.head.appendChild(link)
    }
  }, [])

  const prefetchPages = useCallback(
    async (pages, visitId) => {
      if (!FLOW_PAGE_CACHE_ENABLED) return
      if (!country || !operator || !visitId) return
      await Promise.all(
        pages.map(async (page) => {
          if (pageCacheRef.current.has(page) || prefetchingRef.current.has(page)) return
          prefetchingRef.current.add(page)
          const data = await prefetchFlowPage({
            country,
            operator,
            page,
            msisdn: phoneRef.current,
            visitId,
            campid,
            trackingCampid,
            vid,
            affId,
            clickId: clickIdRef.current || undefined,
            rcid: rcidRef.current || undefined,
          })
          prefetchingRef.current.delete(page)
          if (data?.pageType === page) {
            pageCacheRef.current.set(page, data)
          } else if (data?.pageType && !pageCacheRef.current.has(data.pageType)) {
            pageCacheRef.current.set(data.pageType, data)
          }
        })
      )
    },
    [country, operator, campid, trackingCampid, vid, affId, phoneRef, clickIdRef, rcidRef, pageCacheRef, prefetchingRef]
  )

  useEffect(() => {
    if (!pageData?.pageType || !visitIdRef.current) return
    const nextPages = PRELOAD_BY_PAGE[pageData.pageType] || []
    if (nextPages.length) prefetchPages(nextPages, visitIdRef.current)
  }, [pageData?.pageType, prefetchPages, visitIdRef])

  return { prefetchPages }
}
