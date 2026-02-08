// @hurum/react — useSelector hook

import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { StoreInstance, ResolvedState, Selector } from '@hurum/core'
import { isSelector, structuralEqual } from '@hurum/core'

/**
 * React hook for derived state from a store.
 *
 * Accepts either:
 * - An inline selector function: `(state) => derivedValue`
 * - A pre-built Selector object from `store.selector(fn)`
 *
 * Uses structural equality to prevent unnecessary re-renders.
 */
export function useSelectorHook<TRawState, TComputed, T>(
  store: StoreInstance<unknown, TRawState, TComputed>,
  fnOrSelector: ((state: ResolvedState<TRawState> & TComputed) => T) | Selector<T>,
): T {
  if (isSelector(fnOrSelector)) {
    return useSelectorFromObject(fnOrSelector)
  }
  return useSelectorFromFn(store, fnOrSelector)
}

function useSelectorFromObject<T>(selector: Selector<T>): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => selector.subscribe(() => onStoreChange()),
    [selector],
  )
  return useSyncExternalStore(subscribe, selector.get, selector.get)
}

function useSelectorFromFn<TRawState, TComputed, T>(
  store: StoreInstance<unknown, TRawState, TComputed>,
  selectorFn: (state: ResolvedState<TRawState> & TComputed) => T,
): T {
  // Ref for latest selector fn — keeps subscribe/getSnapshot stable
  const fnRef = useRef(selectorFn)
  fnRef.current = selectorFn

  // Ref for structural equality memoization
  const lastRef = useRef<{ value: T; initialized: boolean }>({ value: undefined as T, initialized: false })

  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(onStoreChange),
    [store],
  )

  const getSnapshot = useCallback((): T => {
    const state = store.getState()
    const next = fnRef.current(state)

    if (lastRef.current.initialized && structuralEqual(lastRef.current.value, next)) {
      return lastRef.current.value
    }

    lastRef.current = { value: next, initialized: true }
    return next
  }, [store])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
