// @hurum/react — StoreProvider component

import { useState, type ReactNode } from 'react'
import type { StoreDefinition, StoreInstance } from '@hurum/core'
import { getContext } from './singleton'

export type StoreProviderProps =
  | {
      of: StoreDefinition
      store: StoreInstance
      children: ReactNode
    }
  | {
      of: StoreDefinition
      store?: undefined
      initialState?: unknown
      deps?: unknown
      children: ReactNode
    }

/**
 * Provides a scoped store instance to descendant components.
 *
 * Two modes:
 * - `<StoreProvider of={Def} store={instance}>` — uses the given instance
 * - `<StoreProvider of={Def}>` — auto-creates a new instance (with optional initialState/deps)
 *
 * Does NOT auto-dispose on unmount (React Strict Mode compatible).
 */
export function StoreProvider(props: StoreProviderProps): ReactNode {
  const { of: def, children } = props
  const Context = getContext(def)
  const externalStore = props.store

  // Always call useState for hook order stability
  const [autoStore] = useState(() => {
    if (externalStore) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return def.create(props as any)
  })

  const instance = externalStore ?? autoStore!

  return <Context.Provider value={instance}>{children}</Context.Provider>
}
