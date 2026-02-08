import { useState, useCallback, useEffect, useRef } from 'react'

export type PanelPosition = 'right' | 'left' | 'bottom'

const STORAGE_KEY = 'hurum-devtools-size'
const MIN_SIZE = 280
const MIN_HEIGHT = 200

function getStoredSize(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    return val ? Number(val) : null
  } catch {
    return null
  }
}

function storeSize(size: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(size))
  } catch { /* ignore */ }
}

export function useResize(position: PanelPosition, defaultSize = 420) {
  const [size, setSize] = useState(() => getStoredSize() ?? defaultSize)
  const isDragging = useRef(false)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const isHorizontal = position === 'right' || position === 'left'
  const minSize = isHorizontal ? MIN_SIZE : MIN_HEIGHT

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startPos.current = isHorizontal ? e.clientX : e.clientY
      startSize.current = size
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [size, isHorizontal],
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const current = isHorizontal ? e.clientX : e.clientY
      const delta = startPos.current - current
      const direction = position === 'left' ? -1 : 1
      const newSize = Math.max(minSize, startSize.current + delta * direction)
      setSize(newSize)
    }

    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      storeSize(size)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isHorizontal, minSize, position, size])

  return { size, onMouseDown }
}
