// @hurum/core — Persist Middleware

import type { Middleware } from '../middleware'

export interface PersistOptions {
  key: string
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  serialize?: (state: Record<string, unknown>) => string
  deserialize?: (raw: string) => Record<string, unknown>
  pick?: string[]
}

export interface PersistHandle {
  middleware: Middleware
  getPersistedState: () => Record<string, unknown> | null
}

function pickKeys(state: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (key in state) {
      result[key] = state[key]
    }
  }
  return result
}

/**
 * Persistence middleware. Saves state to storage on every state change.
 * Use `getPersistedState()` to hydrate on startup via `Store.create({ initialState })`.
 *
 * @example
 * ```ts
 * const persistHandle = persist({ key: 'my-store', pick: ['todos', 'settings'] })
 *
 * const MyStore = Store({ ..., middleware: [persistHandle.middleware] })
 * const store = MyStore.create({ initialState: persistHandle.getPersistedState() ?? undefined })
 * ```
 */
export function persist(options: PersistOptions): PersistHandle {
  const {
    key,
    storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage
      : undefined,
    serialize = JSON.stringify,
    deserialize = JSON.parse as (raw: string) => Record<string, unknown>,
    pick,
  } = options

  const middleware: Middleware = {
    name: 'persist',
    onStateChange: (_prev, next) => {
      if (!storage) return
      try {
        const toPersist = pick ? pickKeys(next, pick) : next
        storage.setItem(key, serialize(toPersist))
      } catch {
        // Silent fail — storage may be full or unavailable
      }
    },
  }

  function getPersistedState(): Record<string, unknown> | null {
    if (!storage) return null
    try {
      const raw = storage.getItem(key)
      if (raw === null) return null
      return deserialize(raw)
    } catch {
      return null
    }
  }

  return { middleware, getPersistedState }
}
