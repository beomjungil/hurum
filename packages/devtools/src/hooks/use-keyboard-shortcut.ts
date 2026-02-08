import { useEffect } from 'react'

export function useKeyboardShortcut(
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean },
  callback: () => void,
): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (modifiers.ctrl && !(e.ctrlKey || e.metaKey)) return
      if (modifiers.shift && !e.shiftKey) return
      if (e.key.toLowerCase() !== key.toLowerCase()) return
      e.preventDefault()
      callback()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [key, modifiers.ctrl, modifiers.shift, callback])
}
