import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { theme } from '../../styles/theme'
import { colors, spacing, fontSize, fontFamily } from '../../styles/tokens'

interface TreeNodeProps {
  label: string
  value: unknown
  depth: number
  defaultExpanded?: boolean
  isComputed?: boolean
  nestedKind?: 'single' | 'array' | 'map'
  path?: string
  changedPaths?: Set<string>
}

function getValuePreview(value: unknown): { text: string; style: CSSProperties } {
  if (value === null) return { text: 'null', style: theme.jsonNull }
  if (value === undefined) return { text: 'undefined', style: theme.jsonNull }
  if (typeof value === 'string') {
    const truncated = value.length > 50 ? value.slice(0, 50) + '...' : value
    return { text: `"${truncated}"`, style: theme.jsonString }
  }
  if (typeof value === 'number') return { text: String(value), style: theme.jsonNumber }
  if (typeof value === 'boolean') return { text: String(value), style: theme.jsonBoolean }
  if (Array.isArray(value)) return { text: `Array(${value.length})`, style: { color: colors.textMuted } }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    return { text: `{${keys.length}}`, style: { color: colors.textMuted } }
  }
  return { text: String(value), style: { color: colors.text } }
}

function isExpandable(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value !== 'object') return false
  if (Array.isArray(value)) return value.length > 0
  return Object.keys(value).length > 0
}

const NESTED_LABEL: Record<string, string> = {
  single: 'N',
  array: 'N[]',
  map: 'N{}',
}

export function TreeNode({ label, value, depth, defaultExpanded, isComputed, nestedKind, path, changedPaths }: TreeNodeProps) {
  const expandable = isExpandable(value)
  const [expanded, setExpanded] = useState(defaultExpanded ?? depth < 1)
  const preview = getValuePreview(value)

  const indent = depth * 14

  const isChanged = path != null && changedPaths != null && changedPaths.size > 0 && changedPaths.has(path)
  const rowRef = useRef<HTMLDivElement>(null)

  // Trigger flash animation via DOM when path is changed — Strict Mode safe
  // No dependency array: must run every render because isChanged can stay true across
  // consecutive state changes, and [isChanged] wouldn't re-fire the effect.
  useEffect(() => {
    if (!isChanged || !rowRef.current) return
    const el = rowRef.current
    // Reset animation to force replay
    el.style.animation = 'none'
    // Force reflow
    void el.offsetWidth
    el.style.animation = ''
    el.setAttribute('data-hurum-flash', '')
  })

  const keyColor = isComputed ? colors.computed : nestedKind ? colors.nested : undefined

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      <div
        ref={rowRef}
        style={theme.treeRow}
      >
        {expandable ? (
          <button
            onClick={() => setExpanded(!expanded)}
            style={theme.treeToggle}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ width: '14px', flexShrink: 0 }} />
        )}
        <span style={{ marginLeft: `${spacing.xs}px` }}>
          <span style={{
            ...theme.jsonKey,
            ...(keyColor ? { color: keyColor } : {}),
          }}>
            {label}
          </span>
          {isComputed && (
            <span style={{
              fontSize: fontSize.xs,
              color: colors.computed,
              marginLeft: `${spacing.xs}px`,
              opacity: 0.7,
            }}>
              C
            </span>
          )}
          {nestedKind && (
            <span style={{
              fontSize: fontSize.xs,
              color: colors.nested,
              marginLeft: `${spacing.xs}px`,
              opacity: 0.7,
            }}>
              {NESTED_LABEL[nestedKind]}
            </span>
          )}
          <span style={{ color: colors.textMuted }}>: </span>
          {(!expandable || !expanded) && (
            <span style={preview.style}>{preview.text}</span>
          )}
        </span>
      </div>

      {expandable && expanded && (
        <div>
          {Array.isArray(value)
            ? value.map((item, i) => (
                <TreeNode
                  key={i}
                  label={String(i)}
                  value={item}
                  depth={depth + 1}
                  path={path != null ? `${path}.${i}` : undefined}
                  changedPaths={changedPaths}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <TreeNode
                  key={k}
                  label={k}
                  value={v}
                  depth={depth + 1}
                  path={path != null ? `${path}.${k}` : undefined}
                  changedPaths={changedPaths}
                />
              ))}
        </div>
      )}
    </div>
  )
}
