import type { Middleware, IntentMode } from '@hurum/core'

// --- Entry types ---

export type DevtoolsEntryType =
  | 'intent-start'
  | 'intent-end'
  | 'event'
  | 'state-change'
  | 'error'

export interface DevtoolsEntry {
  readonly id: number
  readonly timestamp: number
  readonly type: DevtoolsEntryType
  readonly transactionId: number | null

  // event
  readonly eventType?: string
  readonly eventPayload?: unknown
  readonly stateAfterEvent?: Record<string, unknown>

  // intent-start / intent-end
  readonly intentName?: string
  readonly intentMode?: IntentMode
  readonly intentPayload?: unknown
  readonly commandNames?: readonly string[]

  // state-change
  readonly prevState?: Record<string, unknown>
  readonly nextState?: Record<string, unknown>

  // error
  readonly error?: { message: string; stack?: string }
}

// --- Transaction (groups intent lifecycle) ---

export interface DevtoolsTransaction {
  readonly id: number
  readonly intentName?: string
  readonly intentMode: IntentMode
  readonly commandNames?: readonly string[]
  readonly payload: unknown
  readonly startEntryId: number
  readonly childEntryIds: number[]
  readonly endEntryId: number | null
  readonly hasError: boolean
  readonly startTimestamp: number
  readonly endTimestamp: number | null
}

// --- Options & Handle ---

export interface DevtoolsOptions {
  /** Max entries to keep in the circular buffer (default: 200) */
  maxHistory?: number
  /** Label shown in the panel header */
  name?: string
  /** Bypass production check */
  force?: boolean
}

export interface DevtoolsHandle {
  readonly middleware: Middleware
  /** Subscribe to entry changes. Returns unsubscribe function. */
  readonly subscribe: (cb: () => void) => () => void
  /** Get all entries in chronological order. */
  readonly getEntries: () => readonly DevtoolsEntry[]
  /** Get all transactions. */
  readonly getTransactions: () => readonly DevtoolsTransaction[]
  /** Get current store state (if connected). */
  readonly getCurrentState: () => Record<string, unknown> | null
  /** Clear all entries and transactions. */
  readonly clear: () => void
  /** Get computed property keys. */
  readonly getComputedKeys: () => ReadonlySet<string>
  /** Get nested store keys with their kind. */
  readonly getNestedKeys: () => ReadonlyMap<string, 'single' | 'array' | 'map'>
  /** Unregister from the global registry. */
  readonly dispose: () => void
  /** Label for the panel header. */
  readonly name: string
}
