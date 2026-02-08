import { useState } from 'react'
import type { DevtoolsEntry, DevtoolsTransaction } from '../../types'
import { EventLogEntry } from './event-log-entry'
import { theme } from '../../styles/theme'
import { colors, fontSize } from '../../styles/tokens'

interface TransactionGroupProps {
  transaction: DevtoolsTransaction
  entries: readonly DevtoolsEntry[]
  baseTimestamp: number
}

function formatDuration(start: number, end: number | null): string {
  if (end === null) return 'running...'
  const ms = end - start
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function TransactionGroup({ transaction, entries, baseTimestamp }: TransactionGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const childEntries = entries.filter((e) =>
    transaction.childEntryIds.includes(e.id),
  )
  const eventCount = childEntries.filter((e) => e.type === 'event').length
  const stateCount = childEntries.filter((e) => e.type === 'state-change').length
  const errorCount = childEntries.filter((e) => e.type === 'error').length

  return (
    <div>
      <div
        style={{
          ...theme.transactionHeader,
          ...(transaction.hasError ? { background: colors.errorBg } : {}),
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ color: colors.textMuted, fontSize: '10px', flexShrink: 0 }}>
          {expanded ? '▼' : '▶'}
        </span>
        <span style={theme.timestamp}>
          {formatDuration(0, transaction.endTimestamp !== null
            ? transaction.endTimestamp - transaction.startTimestamp
            : null)}
        </span>
        <span style={theme.badge(colors.intent, colors.intentBg)}>
          {transaction.intentName ?? transaction.intentMode}
        </span>
        {transaction.commandNames && transaction.commandNames.length > 0 && (
          <span style={{
            fontSize: fontSize.xs,
            color: colors.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
            flexShrink: 1,
          }}>
            {transaction.commandNames.join(' → ')}
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {eventCount} event{eventCount !== 1 ? 's' : ''}
          {stateCount > 0 && `, ${stateCount} state`}
          {errorCount > 0 && (
            <span style={{ color: colors.error }}> {errorCount} error{errorCount !== 1 ? 's' : ''}</span>
          )}
        </span>
        {transaction.endEntryId === null && (
          <span style={{
            fontSize: fontSize.xs,
            color: colors.intent,
            fontWeight: 600,
          }}>
            RUNNING
          </span>
        )}
      </div>

      {expanded && (
        <div style={theme.transactionChildren}>
          {childEntries.map((entry) => (
            <EventLogEntry
              key={entry.id}
              entry={entry}
              baseTimestamp={baseTimestamp}
            />
          ))}
          {childEntries.length === 0 && (
            <div style={{ ...theme.empty, padding: '8px' }}>No events in this intent</div>
          )}
        </div>
      )}
    </div>
  )
}
