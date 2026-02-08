import type { Middleware, IntentDescriptor } from '@hurum/core'
import { isEventCreator } from '@hurum/core'
import { EventBuffer } from './event-buffer'
import { registerHandle } from './registry'
import type {
  DevtoolsOptions,
  DevtoolsHandle,
  DevtoolsEntry,
  DevtoolsTransaction,
} from './types'

function safeClone<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return value
    }
  }
}

function createNoopHandle(name: string): DevtoolsHandle {
  const noop = () => {}
  return {
    middleware: { name: 'hurum-devtools' },
    subscribe: () => noop,
    getEntries: () => [],
    getTransactions: () => [],
    getCurrentState: () => null,
    getComputedKeys: () => new Set(),
    getNestedKeys: () => new Map(),
    clear: noop,
    dispose: noop,
    name,
  }
}

export function createDevtools(options?: DevtoolsOptions): DevtoolsHandle {
  const name = options?.name ?? 'Hurum Store'

  const isProd =
    !options?.force &&
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV === 'production'
  if (isProd) return createNoopHandle(name)

  const maxHistory = options?.maxHistory ?? 200
  const buffer = new EventBuffer<DevtoolsEntry>(maxHistory)
  const transactions = new Map<number, DevtoolsTransaction>()
  const intentToTx = new WeakMap<IntentDescriptor, number>()
  const activeStack: number[] = []
  let entryId = 0
  let txId = 0
  let latestState: Record<string, unknown> | null = null
  let computedKeys: ReadonlySet<string> = new Set()
  let nestedKeys: ReadonlyMap<string, 'single' | 'array' | 'map'> = new Map()
  const subscribers = new Set<() => void>()

  // Coalesce rapid-fire onStateChange calls (from nested propagation + computed recalc)
  // into a single devtools entry per microtask.
  let pendingStateChange: { prev: Record<string, unknown>; next: Record<string, unknown>; txId: number | null } | null = null

  // Snapshot version — incremented on every mutation so useSyncExternalStore detects changes
  let version = 0
  let entriesSnapshot: readonly DevtoolsEntry[] = []
  let txSnapshot: readonly DevtoolsTransaction[] = []

  function notify(): void {
    version++
    entriesSnapshot = buffer.getAll()
    txSnapshot = [...transactions.values()]
    for (const cb of subscribers) cb()
  }

  const middleware: Middleware = {
    name: 'hurum-devtools',

    onAttach(store) {
      if (store.meta?.computedKeys) computedKeys = new Set(store.meta.computedKeys)
      if (store.meta?.nestedKeys) nestedKeys = new Map(store.meta.nestedKeys.map(n => [n.key, n.kind]))
    },

    onIntentStart(intent, payload) {
      const id = txId++
      intentToTx.set(intent, id)
      activeStack.push(id)

      const cmdNames = intent.steps
        .map((step) => isEventCreator(step) ? step.type : step.name)
        .filter((n): n is string => typeof n === 'string')

      const entry: DevtoolsEntry = {
        id: entryId++,
        timestamp: performance.now(),
        type: 'intent-start',
        transactionId: id,
        intentName: intent.name,
        intentMode: intent.mode,
        intentPayload: safeClone(payload),
        commandNames: cmdNames.length > 0 ? cmdNames : undefined,
      }
      buffer.push(entry)

      const tx: DevtoolsTransaction = {
        id,
        intentName: intent.name,
        intentMode: intent.mode,
        commandNames: cmdNames.length > 0 ? cmdNames : undefined,
        payload: safeClone(payload),
        startEntryId: entry.id,
        childEntryIds: [],
        endEntryId: null,
        hasError: false,
        startTimestamp: entry.timestamp,
        endTimestamp: null,
      }
      transactions.set(id, tx)
      notify()
      postToExtension(entry)
    },

    onEvent(event, state) {
      latestState = state
      const currentTxId = activeStack.at(-1) ?? null
      const entry: DevtoolsEntry = {
        id: entryId++,
        timestamp: performance.now(),
        type: 'event',
        transactionId: currentTxId,
        eventType: event.type,
        eventPayload: safeClone(event),
        stateAfterEvent: safeClone(state),
      }
      buffer.push(entry)

      if (currentTxId !== null) {
        const tx = transactions.get(currentTxId)
        if (tx) {
          ;(tx.childEntryIds as number[]).push(entry.id)
        }
      }
      notify()
      postToExtension(entry)
    },

    onStateChange(_prev, next) {
      latestState = next
      const currentTxId = activeStack.at(-1) ?? null

      if (pendingStateChange) {
        // Coalesce: keep original prev, update to latest next
        pendingStateChange.next = safeClone(next)
      } else {
        pendingStateChange = {
          prev: safeClone(_prev),
          next: safeClone(next),
          txId: currentTxId,
        }
        // Flush on next microtask — coalesces all synchronous state changes into one entry
        queueMicrotask(() => {
          if (!pendingStateChange) return
          const { prev, next: nextState, txId } = pendingStateChange
          pendingStateChange = null

          const entry: DevtoolsEntry = {
            id: entryId++,
            timestamp: performance.now(),
            type: 'state-change',
            transactionId: txId,
            prevState: prev,
            nextState: nextState,
          }
          buffer.push(entry)

          if (txId !== null) {
            const tx = transactions.get(txId)
            if (tx) {
              ;(tx.childEntryIds as number[]).push(entry.id)
            }
          }
          notify()
          postToExtension(entry)
        })
      }
    },

    onIntentEnd(intent) {
      const id = intentToTx.get(intent)
      if (id === undefined) return

      const idx = activeStack.lastIndexOf(id)
      if (idx !== -1) activeStack.splice(idx, 1)

      const entry: DevtoolsEntry = {
        id: entryId++,
        timestamp: performance.now(),
        type: 'intent-end',
        transactionId: id,
      }
      buffer.push(entry)

      const tx = transactions.get(id)
      if (tx) {
        ;(tx as { endEntryId: number | null }).endEntryId = entry.id
        ;(tx as { endTimestamp: number | null }).endTimestamp = entry.timestamp
      }
      notify()
      postToExtension(entry)
    },

    onError(error, _context) {
      const currentTxId = activeStack.at(-1) ?? null
      const entry: DevtoolsEntry = {
        id: entryId++,
        timestamp: performance.now(),
        type: 'error',
        transactionId: currentTxId,
        error: { message: error.message, stack: error.stack },
      }
      buffer.push(entry)

      if (currentTxId !== null) {
        const tx = transactions.get(currentTxId)
        if (tx) {
          ;(tx.childEntryIds as number[]).push(entry.id)
          ;(tx as { hasError: boolean }).hasError = true
        }
      }
      notify()
      postToExtension(entry)
    },
  }

  function postToExtension(entry: DevtoolsEntry): void {
    if (typeof window !== 'undefined') {
      try {
        window.postMessage({
          source: 'hurum-devtools',
          type: 'HURUM_ENTRY',
          storeName: name,
          entry: safeClone(entry),
        }, '*')
      } catch { /* ignore */ }
    }
  }

  let unregister: (() => void) | null = null

  const handle: DevtoolsHandle = {
    middleware,
    subscribe(cb) {
      subscribers.add(cb)
      return () => { subscribers.delete(cb) }
    },
    getEntries: () => entriesSnapshot,
    getTransactions: () => txSnapshot,
    getCurrentState: () => latestState,
    getComputedKeys: () => computedKeys,
    getNestedKeys: () => nestedKeys,
    clear() {
      buffer.clear()
      transactions.clear()
      activeStack.length = 0
      notify()
    },
    dispose() {
      unregister?.()
      unregister = null
    },
    name,
  }

  unregister = registerHandle(handle)

  return handle
}
