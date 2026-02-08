import type { DiffEntry } from './compute-diff'
import { colors, spacing, fontSize, fontFamily } from '../../styles/tokens'

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') {
    const truncated = value.length > 30 ? value.slice(0, 30) + '...' : value
    return `"${truncated}"`
  }
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  if (typeof value === 'object') return `{${Object.keys(value).length}}`
  return String(value)
}

function valueColor(value: unknown): string {
  if (value === null || value === undefined) return colors.null
  if (typeof value === 'string') return colors.string
  if (typeof value === 'number') return colors.number
  if (typeof value === 'boolean') return colors.boolean
  return colors.textMuted
}

interface DiffViewProps {
  diffs: DiffEntry[]
}

export function DiffView({ diffs }: DiffViewProps) {
  if (diffs.length === 0) {
    return <div style={{ color: colors.textMuted, fontSize: fontSize.xs, padding: `${spacing.sm}px 0` }}>No changes</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {diffs.map((d) => (
        <div
          key={d.path}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: `${spacing.md}px`,
            fontSize: fontSize.sm,
            fontFamily,
            lineHeight: '1.6',
            padding: `0 ${spacing.sm}px`,
          }}
        >
          <span style={{ color: colors.key, flexShrink: 0 }}>{d.path}</span>
          {d.modified ? (
            <span style={{ color: colors.stateChange, fontStyle: 'italic', opacity: 0.8 }}>modified</span>
          ) : d.prevValue === undefined ? (
            <span style={{ color: colors.stateChange }}>+ {formatValue(d.nextValue)}</span>
          ) : d.nextValue === undefined ? (
            <span style={{ color: colors.error, textDecoration: 'line-through' }}>- {formatValue(d.prevValue)}</span>
          ) : (
            <>
              <span style={{ color: valueColor(d.prevValue), textDecoration: 'line-through', opacity: 0.6 }}>
                {formatValue(d.prevValue)}
              </span>
              <span style={{ color: colors.textMuted }}>→</span>
              <span style={{ color: valueColor(d.nextValue) }}>
                {formatValue(d.nextValue)}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
