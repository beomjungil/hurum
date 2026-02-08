import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'hurum-devtools-panel'

export type PanelMode = 'closed' | 'open'

export function usePanelState(defaultOpen?: boolean) {
  const [mode, setMode] = useState<PanelMode>(() => {
    if (defaultOpen) return 'open'
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'open' || stored === 'closed') return stored
    } catch { /* ignore */ }
    return 'closed'
  })

  const toggle = useCallback(() => {
    setMode((prev) => (prev === 'open' ? 'closed' : 'open'))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch { /* ignore */ }
  }, [mode])

  return { mode, setMode, toggle }
}
