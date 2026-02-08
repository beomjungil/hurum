import { useState, useMemo } from 'react'
import type { DevtoolsEntry } from '../../types'
import { theme } from '../../styles/theme'
import { colors } from '../../styles/tokens'
import { JsonTree } from '../state-inspector/json-tree'
import { computeStateDiff } from '../state-inspector/compute-diff'
import { DiffView } from '../state-inspector/diff-view'

interface EventLogEntryProps {
  entry: DevtoolsEntry
  baseTimestamp: number
}

const TYPE_CONFIG = {
  event: { label: 'EVT', color: colors.event, bg: colors.eventBg },
  'intent-start': { label: 'INT', color: colors.intent, bg: colors.intentBg },
  'intent-end': { label: 'END', color: colors.intent, bg: colors.intentBg },
  'state-change': { label: 'STA', color: colors.stateChange, bg: colors.stateChangeBg },
  error: { label: 'ERR', color: colors.error, bg: colors.errorBg },
} as const

function formatTime(ms: number): string {
  if (ms < 1000) return `+${ms.toFixed(0)}ms`
  return `+${(ms / 1000).toFixed(2)}s`
}

function getEntryName(entry: DevtoolsEntry): string {
  switch (entry.type) {
    case 'event':
      return entry.eventType ?? 'unknown'
    case 'intent-start': {
      const name = entry.intentName ?? `Intent (${entry.intentMode ?? '?'})`
      const cmds = entry.commandNames?.length
        ? ` [${entry.commandNames.join(', ')}]`
        : ''
      return name + cmds
    }
    case 'intent-end':
      return entry.intentName ? `${entry.intentName} End` : 'Intent End'
    case 'state-change':
      return 'State Change'
    case 'error':
      return entry.error?.message ?? 'Error'
  }
}

function getEntryPayload(entry: DevtoolsEntry): Record<string, unknown> | null {
  switch (entry.type) {
    case 'event':
      return entry.eventPayload as Record<string, unknown> | null
    case 'intent-start':
      return entry.intentPayload as Record<string, unknown> | null
    case 'state-change':
      return { prev: entry.prevState, next: entry.nextState } as Record<string, unknown>
    case 'error':
      return entry.error as Record<string, unknown> | null
    default:
      return null
  }
}

function StateChangeDiff({ entry }: { entry: DevtoolsEntry }) {
  const diffs = useMemo(
    () => computeStateDiff(entry.prevState!, entry.nextState!),
    [entry.prevState, entry.nextState],
  )
  return <DiffView diffs={diffs} />
}

export function EventLogEntry({ entry, baseTimestamp }: EventLogEntryProps) {
  const [expanded, setExpanded] = useState(false)
  const config = TYPE_CONFIG[entry.type]
  const payload = getEntryPayload(entry)
  const isStateChange = entry.type === 'state-change' && entry.prevState && entry.nextState

  return (
    <div>
      <div
        style={{
          ...theme.entryRow,
          background: expanded ? config.bg : 'transparent',
        }}
        onClick={() => payload && setExpanded(!expanded)}
      >
        <span style={theme.timestamp}>
          {formatTime(entry.timestamp - baseTimestamp)}
        </span>
        <span style={theme.badge(config.color, config.bg)}>
          {config.label}
        </span>
        <span style={theme.entryName}>{getEntryName(entry)}</span>
        {payload && (
          <span style={{ color: colors.textMuted, fontSize: '10px', flexShrink: 0 }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {expanded && payload && (
        <div style={{ padding: '4px 8px 8px 68px' }}>
          {isStateChange ? (
            <StateChangeDiff entry={entry} />
          ) : (
            <JsonTree data={payload} />
          )}
        </div>
      )}
    </div>
  )
}
