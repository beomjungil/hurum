import { useState, useRef, useMemo, useCallback } from 'react'
import type { DevtoolsHandle, DevtoolsEntryType } from '../../types'
import { useDevtoolsEntries, useDevtoolsTransactions } from '../../hooks/use-devtools-entries'
import { useAutoScroll } from '../../hooks/use-auto-scroll'
import { EventLogEntry } from './event-log-entry'
import { TransactionGroup } from './transaction-group'
import { FilterBar, type FilterState } from './filter-bar'
import { theme } from '../../styles/theme'

interface EventLogTabProps {
  handle: DevtoolsHandle
}

const ALL_TYPES: Set<DevtoolsEntryType> = new Set([
  'event',
  'intent-start',
  'intent-end',
  'state-change',
  'error',
])

export function EventLogTab({ handle }: EventLogTabProps) {
  const entries = useDevtoolsEntries(handle)
  const transactions = useDevtoolsTransactions(handle)
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, entries.length)

  const [filter, setFilter] = useState<FilterState>({
    search: '',
    types: new Set(ALL_TYPES),
  })

  const onSearchChange = useCallback((search: string) => {
    setFilter((prev) => ({ ...prev, search }))
  }, [])

  const onTypeToggle = useCallback((type: DevtoolsEntryType) => {
    setFilter((prev) => {
      const next = new Set(prev.types)
      if (next.has(type)) {
        next.delete(type)
        // Also toggle paired types
        if (type === 'intent-start') next.delete('intent-end')
      } else {
        next.add(type)
        if (type === 'intent-start') next.add('intent-end')
      }
      return { ...prev, types: next }
    })
  }, [])

  const baseTimestamp = entries.length > 0 ? entries[0]!.timestamp : 0

  // Group entries: transactions are rendered as groups, orphan entries standalone
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!filter.types.has(e.type)) return false
      if (filter.search) {
        const search = filter.search.toLowerCase()
        const name = e.eventType ?? e.error?.message ?? e.type
        if (!name.toLowerCase().includes(search)) return false
      }
      return true
    })
  }, [entries, filter])

  // Build a set of entry IDs that belong to transactions
  const txEntryIds = useMemo(() => {
    const ids = new Set<number>()
    for (const tx of transactions) {
      ids.add(tx.startEntryId)
      for (const id of tx.childEntryIds) ids.add(id)
      if (tx.endEntryId !== null) ids.add(tx.endEntryId)
    }
    return ids
  }, [transactions])

  // Render order: iterate filtered entries, render transaction groups inline at the start entry
  const renderedTxIds = new Set<number>()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FilterBar
        filter={filter}
        onSearchChange={onSearchChange}
        onTypeToggle={onTypeToggle}
      />
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        {filteredEntries.length === 0 && (
          <div style={theme.empty}>No events recorded yet</div>
        )}
        {filteredEntries.map((entry) => {
          // If entry is a transaction start, render the whole group
          if (entry.type === 'intent-start' && entry.transactionId !== null) {
            if (renderedTxIds.has(entry.transactionId)) return null
            renderedTxIds.add(entry.transactionId)
            const tx = transactions.find((t) => t.id === entry.transactionId)
            if (tx && filter.types.has('intent-start')) {
              return (
                <TransactionGroup
                  key={`tx-${tx.id}`}
                  transaction={tx}
                  entries={entries}
                  baseTimestamp={baseTimestamp}
                />
              )
            }
          }

          // Skip entries that belong to a transaction (rendered inside TransactionGroup)
          if (txEntryIds.has(entry.id)) return null

          return (
            <EventLogEntry
              key={entry.id}
              entry={entry}
              baseTimestamp={baseTimestamp}
            />
          )
        })}
      </div>
    </div>
  )
}
