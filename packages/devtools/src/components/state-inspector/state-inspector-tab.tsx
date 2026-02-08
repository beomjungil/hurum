import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { DevtoolsHandle } from '../../types'
import { useChangedPaths } from '../../hooks/use-changed-paths'
import { JsonTree } from './json-tree'
import { StateDiffTimeline } from './state-diff-timeline'
import { theme } from '../../styles/theme'

const FLASH_STYLE_ID = 'hurum-devtools-flash'

interface StateInspectorTabProps {
  handle: DevtoolsHandle
}

export function StateInspectorTab({ handle }: StateInspectorTabProps) {
  // Inject flash keyframe once
  useEffect(() => {
    if (document.getElementById(FLASH_STYLE_ID)) return
    const style = document.createElement('style')
    style.id = FLASH_STYLE_ID
    style.textContent = `
@keyframes hurum-flash {
  0%   { background-color: rgba(63, 185, 80, 0.35); }
  100% { background-color: transparent; }
}
[data-hurum-flash] { animation: hurum-flash 700ms ease-out; }
`
    document.head.appendChild(style)
  }, [])

  const subscribe = useCallback(
    (cb: () => void) => handle.subscribe(cb),
    [handle],
  )
  const getState = useCallback(() => handle.getCurrentState(), [handle])
  const state = useSyncExternalStore(subscribe, getState, getState)

  const getEntries = useCallback(() => handle.getEntries(), [handle])
  const entries = useSyncExternalStore(subscribe, getEntries, getEntries)

  const computedKeys = useMemo(() => handle.getComputedKeys(), [handle])
  const nestedKeys = useMemo(() => handle.getNestedKeys(), [handle])

  const changedPaths = useChangedPaths(state)

  if (!state) {
    return <div style={theme.empty}>No store connected. Add devtools middleware to your store.</div>
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={theme.sectionHeader}>Current State</div>
      <JsonTree
        data={state}
        computedKeys={computedKeys}
        nestedKeys={nestedKeys}
        changedPaths={changedPaths}
      />
      <div style={{ ...theme.sectionHeader, marginTop: '8px' }}>State Changes</div>
      <StateDiffTimeline entries={entries} />
    </div>
  )
}
