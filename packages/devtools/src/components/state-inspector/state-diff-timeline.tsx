import { useState, useMemo } from 'react'
import type { DevtoolsEntry } from '../../types'
import { computeStateDiff } from './compute-diff'
import { DiffView } from './diff-view'
import { colors, spacing, fontSize, fontFamily, radius } from '../../styles/tokens'

interface StateDiffTimelineProps {
  entries: readonly DevtoolsEntry[]
}

export function StateDiffTimeline({ entries }: StateDiffTimelineProps) {
  const stateChanges = useMemo(
    () => entries
      .filter((e) => e.type === 'state-change' && e.prevState && e.nextState)
      .filter((e) => computeStateDiff(e.prevState!, e.nextState!).length > 0)
      .reverse(),
    [entries],
  )

  if (stateChanges.length === 0) {
    return (
      <div style={{ color: colors.textMuted, fontSize: fontSize.xs, padding: `${spacing.md}px 0`, textAlign: 'center' }}>
        No state changes yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {stateChanges.map((entry) => (
        <DiffTimelineEntry key={entry.id} entry={entry} baseTimestamp={entries[0]?.timestamp ?? 0} />
      ))}
    </div>
  )
}

function DiffTimelineEntry({ entry, baseTimestamp }: { entry: DevtoolsEntry; baseTimestamp: number }) {
  const [expanded, setExpanded] = useState(false)

  const diffs = useMemo(
    () => computeStateDiff(entry.prevState!, entry.nextState!),
    [entry.prevState, entry.nextState],
  )

  const elapsed = entry.timestamp - baseTimestamp
  const timeLabel = elapsed < 1000 ? `+${elapsed.toFixed(0)}ms` : `+${(elapsed / 1000).toFixed(2)}s`
  const summary = diffs.map((d) => d.path).join(', ')

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${spacing.md}px`,
          padding: `${spacing.xs}px ${spacing.md}px`,
          cursor: 'pointer',
          fontSize: fontSize.xs,
          fontFamily,
          borderBottom: `1px solid ${colors.border}`,
          background: expanded ? colors.stateChangeBg : 'transparent',
        }}
      >
        <span style={{ color: colors.textMuted, flexShrink: 0, minWidth: '48px' }}>{timeLabel}</span>
        <span style={{
          display: 'inline-block',
          padding: `0 ${spacing.sm}px`,
          borderRadius: radius.sm,
          fontSize: fontSize.xs,
          fontWeight: 600,
          color: colors.stateChange,
          background: colors.stateChangeBg,
          flexShrink: 0,
        }}>
          {diffs.length} {diffs.length === 1 ? 'change' : 'changes'}
        </span>
        <span style={{
          color: colors.textMuted,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {summary}
        </span>
        <span style={{ color: colors.textMuted, flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div style={{ padding: `${spacing.sm}px ${spacing.md}px ${spacing.md}px ${spacing.xl}px` }}>
          <DiffView diffs={diffs} />
        </div>
      )}
    </div>
  )
}
