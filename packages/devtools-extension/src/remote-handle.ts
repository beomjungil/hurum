import type { DevtoolsHandle, DevtoolsEntry, DevtoolsTransaction } from '@hurum/devtools'

const MAX_ENTRIES = 500

/**
 * Creates a DevtoolsHandle that accumulates entries received from the
 * Chrome extension port (background → panel).
 *
 * The handle does NOT have a real middleware or store reference — it only
 * replays entries forwarded from the inspected page.
 */
export function createRemoteHandle(name: string): DevtoolsHandle & { pushEntry: (entry: DevtoolsEntry) => void } {
  const entries: DevtoolsEntry[] = []
  const transactions = new Map<number, DevtoolsTransaction>()
  const subscribers = new Set<() => void>()

  let entriesSnapshot: readonly DevtoolsEntry[] = []
  let txSnapshot: readonly DevtoolsTransaction[] = []

  function notify(): void {
    entriesSnapshot = [...entries]
    txSnapshot = [...transactions.values()]
    for (const cb of subscribers) cb()
  }

  function pushEntry(entry: DevtoolsEntry): void {
    entries.push(entry)

    // Evict oldest if over limit
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES)
    }

    // Build/update transactions from entries
    switch (entry.type) {
      case 'intent-start': {
        if (entry.transactionId !== null) {
          const tx: DevtoolsTransaction = {
            id: entry.transactionId,
            intentName: entry.intentName,
            intentMode: entry.intentMode ?? 'SEQUENTIAL',
            commandNames: entry.commandNames,
            payload: entry.intentPayload,
            startEntryId: entry.id,
            childEntryIds: [],
            endEntryId: null,
            hasError: false,
            startTimestamp: entry.timestamp,
            endTimestamp: null,
          }
          transactions.set(entry.transactionId, tx)
        }
        break
      }
      case 'event':
      case 'state-change': {
        if (entry.transactionId !== null) {
          const tx = transactions.get(entry.transactionId)
          if (tx) {
            ;(tx.childEntryIds as number[]).push(entry.id)
          }
        }
        break
      }
      case 'intent-end': {
        if (entry.transactionId !== null) {
          const tx = transactions.get(entry.transactionId)
          if (tx) {
            ;(tx as { endEntryId: number | null }).endEntryId = entry.id
            ;(tx as { endTimestamp: number | null }).endTimestamp = entry.timestamp
          }
        }
        break
      }
      case 'error': {
        if (entry.transactionId !== null) {
          const tx = transactions.get(entry.transactionId)
          if (tx) {
            ;(tx.childEntryIds as number[]).push(entry.id)
            ;(tx as { hasError: boolean }).hasError = true
          }
        }
        break
      }
    }

    notify()
  }

  const noop = () => {}

  return {
    middleware: { name: 'hurum-devtools-extension' },
    subscribe(cb) {
      subscribers.add(cb)
      return () => { subscribers.delete(cb) }
    },
    getEntries: () => entriesSnapshot,
    getTransactions: () => txSnapshot,
    getCurrentState: () => null,
    getComputedKeys: () => new Set(),
    getNestedKeys: () => new Map(),
    clear() {
      entries.length = 0
      transactions.clear()
      notify()
    },
    dispose: noop,
    name,
    pushEntry,
  }
}
