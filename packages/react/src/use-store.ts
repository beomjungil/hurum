// @hurum/react — useStore hook

import { useContext, useMemo } from 'react'
import type { StoreDefinition, StoreInstance, IntentRef, ResolvedState, ScopeOf, SendFn, Selector } from '@hurum/core'
import { isStoreDefinition } from '@hurum/core'
import type { EventInstance } from '@hurum/core'
import { getContext, getSingleton, NULL_CONTEXT } from './singleton'
import { createUseProxy } from './hooks'
import { useSelectorHook } from './use-selector'

/**
 * The object returned by useStore(). Provides:
 * - `.use.fieldName()` hooks for reading individual fields
 * - `.useSelector(fn)` for derived state with structural equality
 * - `.send()` for dispatching intents (supports PreparedIntent + named shortcuts)
 * - `.cancel()` / `.cancelAll()` for cancellation
 * - `.subscribe()` for event subscriptions
 * - `.scope` for nested store access
 * - `.getState()` for reading full state
 * - `.dispose()` for cleanup
 */
export interface UseStoreReturn<TRawState = unknown, TComputed = unknown, TIntents extends Record<string, unknown> = Record<string, never>> {
  readonly use: {
    readonly [K in keyof (ResolvedState<TRawState> & TComputed)]: () => (ResolvedState<TRawState> & TComputed)[K]
  }
  /** Derived state hook with structural equality memoization. */
  useSelector<T>(fn: (state: ResolvedState<TRawState> & TComputed) => T): T
  useSelector<T>(selector: Selector<T>): T
  send: SendFn<TIntents>
  cancel(ref: IntentRef): void
  cancelAll(): void
  getState(): ResolvedState<TRawState> & TComputed
  subscribe(cb: (state: ResolvedState<TRawState> & TComputed) => void): () => void
  subscribe(type: 'events', cb: (event: EventInstance) => void): () => void
  dispose(): void
  readonly scope: ScopeOf<TRawState>
}

/**
 * Context-aware hook to get a store handle.
 *
 * Accepts either a StoreDefinition or a StoreInstance:
 * - `useStore(def)` — Inside Provider → scoped instance. Outside → singleton fallback.
 * - `useStore(instance)` — Uses the given instance directly.
 *
 * The returned object has `.use.fieldName()` hooks for granular subscriptions.
 */
export function useStore<TDeps, TRawState, TComputed, TIntents extends Record<string, unknown> = Record<string, never>>(
  def: StoreDefinition<TDeps, TRawState, TComputed, TIntents>,
): UseStoreReturn<TRawState, TComputed, TIntents>
export function useStore<TDeps, TRawState, TComputed, TIntents extends Record<string, unknown> = Record<string, never>>(
  instance: StoreInstance<TDeps, TRawState, TComputed, TIntents>,
): UseStoreReturn<TRawState, TComputed, TIntents>
export function useStore(
  defOrInstance: StoreDefinition | StoreInstance,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): UseStoreReturn<any, any, any> {
  const isDef = isStoreDefinition(defOrInstance)
  // Always call useContext unconditionally (hooks rules). NULL_CONTEXT when receiving instance.
  const ctx = useContext(isDef ? getContext(defOrInstance as StoreDefinition) : NULL_CONTEXT)
  const store = isDef
    ? (ctx ?? getSingleton(defOrInstance as StoreDefinition))
    : (defOrInstance as StoreInstance)
  return useStoreHandle(store)
}

function useStoreHandle<TRawState, TComputed, TIntents extends Record<string, unknown> = Record<string, never>>(
  store: StoreInstance<unknown, TRawState, TComputed, TIntents>,
): UseStoreReturn<TRawState, TComputed, TIntents> {
  const handle = useMemo(() => {
    const useProxy = createUseProxy(
      () => store,
    )
    return {
      use: useProxy as UseStoreReturn<TRawState, TComputed, TIntents>['use'],
      useSelector: <T>(fnOrSelector: ((state: ResolvedState<TRawState> & TComputed) => T) | Selector<T>): T => {
        return useSelectorHook(store, fnOrSelector)
      },
      // Use store.send directly — it's already a Proxy with intent shortcuts.
      // Don't use .bind() which would create a plain function losing the Proxy.
      send: store.send as SendFn<TIntents>,
      cancel: store.cancel.bind(store),
      cancelAll: store.cancelAll.bind(store),
      getState: store.getState.bind(store) as () => ResolvedState<TRawState> & TComputed,
      subscribe: store.subscribe.bind(store) as UseStoreReturn<TRawState, TComputed, TIntents>['subscribe'],
      dispose: store.dispose.bind(store),
      scope: store.scope as ScopeOf<TRawState>,
    }
  }, [store])

  return handle
}
