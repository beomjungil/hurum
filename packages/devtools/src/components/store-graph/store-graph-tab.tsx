import type { DevtoolsHandle } from '../../types'
import { theme } from '../../styles/theme'
import { TreeNode } from '../state-inspector/tree-node'

interface StoreGraphTabProps {
  handle: DevtoolsHandle
}

export function StoreGraphTab({ handle }: StoreGraphTabProps) {
  const state = handle.getCurrentState()

  if (!state) {
    return <div style={theme.empty}>No store connected.</div>
  }

  // Simple: render top-level keys that look like nested stores (objects with their own sub-objects)
  const nestedKeys = Object.entries(state).filter(
    ([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v),
  )
  const primitiveKeys = Object.entries(state).filter(
    ([, v]) => v === null || typeof v !== 'object' || Array.isArray(v),
  )

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={theme.sectionHeader}>Store Hierarchy</div>
      {nestedKeys.map(([key, value]) => (
        <TreeNode
          key={key}
          label={key}
          value={value}
          depth={0}
          defaultExpanded={false}
        />
      ))}
      {primitiveKeys.length > 0 && (
        <>
          <div style={{ ...theme.sectionHeader, marginTop: '8px' }}>Root State</div>
          {primitiveKeys.map(([key, value]) => (
            <TreeNode
              key={key}
              label={key}
              value={value}
              depth={0}
            />
          ))}
        </>
      )}
    </div>
  )
}
