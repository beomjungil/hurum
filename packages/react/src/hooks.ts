// @hurum/react — Core hooks using useSyncExternalStore

import { useCallback, useSyncExternalStore } from 'react'
import type { StoreInstance } from '@hurum/core'

/**
 * Create a `use.fieldName()` hook for a specific field on a specific store instance.
 * Uses `useSyncExternalStore` internally.
 */
function createFieldHook(getStore: () => StoreInstance, fieldName: string) {
  return function useField() {
    const store = getStore()
    const subscribe = useCallback(
      (onStoreChange: () => void) => store.subscribe(onStoreChange),
      [store],
    )
    const getSnapshot = useCallback(
      () => (store.getState() as Record<string, unknown>)[fieldName],
      [store],
    )
    // getServerSnapshot returns the same snapshot — the store instance
    // is already initialized with correct state on the server via Store.create()
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  }
}

/**
 * Create the `use.*` proxy for a store.
 * Accessing `use.fieldName` returns a hook that reads that field.
 */
export function createUseProxy(getStore: () => StoreInstance): Record<string, () => unknown> {
  const hookCache = new Map<string, () => unknown>()
  return new Proxy({} as Record<string, () => unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      let hook = hookCache.get(prop)
      if (!hook) {
        hook = createFieldHook(getStore, prop)
        hookCache.set(prop, hook)
      }
      return hook
    },
  })
}
