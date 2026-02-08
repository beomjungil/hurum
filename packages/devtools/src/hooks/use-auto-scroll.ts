import { useEffect, useRef, type RefObject } from 'react'

export function useAutoScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  depCount: number,
): void {
  const isAtBottom = useRef(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handleScroll() {
      if (!el) return
      isAtBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 40
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [containerRef])

  useEffect(() => {
    if (isAtBottom.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [depCount, containerRef])
}
