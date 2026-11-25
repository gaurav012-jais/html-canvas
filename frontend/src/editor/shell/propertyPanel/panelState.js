import { useState, useCallback, useRef, useEffect } from 'react'

export const PROPS_COLLAPSED_KEY = 'tc-editor-props-collapsed'
export const PROPS_WIDTH_KEY = 'tc-editor-props-width'
export const PROPS_WIDTH_DEFAULT = 288
export const PROPS_WIDTH_MIN = 240
export const PROPS_WIDTH_MAX = 560
export const PROPS_WIDTH_ADVANCED_MIN = 360

export function clampPropsWidth(w) {
  return Math.min(PROPS_WIDTH_MAX, Math.max(PROPS_WIDTH_MIN, Math.round(w)))
}

export function usePropsCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(PROPS_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PROPS_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { collapsed, toggleCollapsed }
}

export function usePropsWidth(advancedMode) {
  const [width, setWidth] = useState(() => {
    try {
      const v = Number.parseInt(localStorage.getItem(PROPS_WIDTH_KEY), 10)
      if (Number.isFinite(v)) return clampPropsWidth(v)
    } catch {
      /* ignore */
    }
    return PROPS_WIDTH_DEFAULT
  })

  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(PROPS_WIDTH_DEFAULT)

  const effectiveWidth =
    advancedMode && width < PROPS_WIDTH_ADVANCED_MIN
      ? PROPS_WIDTH_ADVANCED_MIN
      : width

  const startResize = useCallback(
    (e) => {
      e.preventDefault()
      isResizingRef.current = true
      startXRef.current = e.clientX
      startWidthRef.current = effectiveWidth
      document.body.classList.add('select-none')

      const handleMove = (ev) => {
        if (!isResizingRef.current) return
        const delta = startXRef.current - ev.clientX
        const next = clampPropsWidth(startWidthRef.current + delta)
        setWidth(next)
      }

      const handleUp = () => {
        if (!isResizingRef.current) return
        isResizingRef.current = false
        document.body.classList.remove('select-none')
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
        setWidth((finalWidth) => {
          try {
            localStorage.setItem(PROPS_WIDTH_KEY, String(finalWidth))
          } catch {
            /* ignore */
          }
          return finalWidth
        })
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [effectiveWidth],
  )

  return { width: effectiveWidth, startResize }
}
