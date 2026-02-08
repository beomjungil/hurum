import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { DevtoolsHandle } from './types'
import type { PanelPosition } from './hooks/use-resize'
import { usePanelState } from './hooks/use-panel-state'
import { useKeyboardShortcut } from './hooks/use-keyboard-shortcut'
import { useDevtoolsEntries } from './hooks/use-devtools-entries'
import { getRegisteredHandles, subscribeToRegistry } from './registry'
import { ToggleButton } from './components/toggle-button'
import { PanelShell } from './components/panel-shell'

const POSITION_STORAGE_KEY = 'hurum-devtools-position'

function getStoredPosition(): PanelPosition | null {
  try {
    const val = localStorage.getItem(POSITION_STORAGE_KEY)
    if (val === 'right' || val === 'left' || val === 'bottom') return val
    return null
  } catch {
    return null
  }
}

function storePosition(pos: PanelPosition): void {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, pos)
  } catch { /* ignore */ }
}

interface HurumDevtoolsProps {
  defaultOpen?: boolean
  position?: PanelPosition
}

const IS_PROD =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

export function HurumDevtools({ defaultOpen, position: initialPosition = 'right' }: HurumDevtoolsProps) {
  if (IS_PROD) return null

  const handles = useSyncExternalStore(subscribeToRegistry, getRegisteredHandles, getRegisteredHandles)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState<PanelPosition>(() => getStoredPosition() ?? initialPosition)

  const handlePositionChange = useCallback((pos: PanelPosition) => {
    setPosition(pos)
    storePosition(pos)
  }, [])

  // Clamp index if handles change
  const activeIndex = handles.length > 0 ? Math.min(selectedIndex, handles.length - 1) : -1
  const activeHandle = activeIndex >= 0 ? handles[activeIndex]! : null

  const { mode, toggle, setMode } = usePanelState(defaultOpen)
  const stableToggle = useCallback(toggle, [toggle])
  useKeyboardShortcut('d', { ctrl: true, shift: true }, stableToggle)

  // Check for errors across all handles
  const hasErrors = useAnyHandleErrors(handles)

  // Portal container
  const [container] = useState(() => {
    if (typeof document === 'undefined') return null
    const el = document.createElement('div')
    el.id = 'hurum-devtools-root'
    el.setAttribute('data-hurum-devtools', '')
    return el
  })

  useEffect(() => {
    if (!container) return
    document.body.appendChild(container)
    return () => {
      container.remove()
    }
  }, [container])

  if (!container || handles.length === 0) return null

  return createPortal(
    <>
      <ToggleButton
        onClick={stableToggle}
        hasErrors={hasErrors}
        isOpen={mode === 'open'}
      />
      {mode === 'open' && activeHandle && (
        <PanelShell
          handle={activeHandle}
          handles={handles}
          selectedIndex={activeIndex}
          onSelectStore={setSelectedIndex}
          onClose={() => setMode('closed')}
          position={position}
          onPositionChange={handlePositionChange}
        />
      )}
    </>,
    container,
  )
}

/** Returns true if any registered handle has error entries. */
function useAnyHandleErrors(handles: readonly DevtoolsHandle[]): boolean {
  // Subscribe to the first handle that has entries (lightweight check)
  const firstHandle = handles[0] ?? null
  const entries = useDevtoolsEntries(firstHandle)
  return useMemo(
    () => entries.some((e) => e.type === 'error'),
    [entries],
  )
}
