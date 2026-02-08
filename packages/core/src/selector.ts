// @hurum/core — Selector

import { structuralEqual } from './computed'

/** A memoized derived state accessor with structural equality. */
export interface Selector<T> {
  /** Get the current derived value (memoized). */
  get(): T
  /** Subscribe to changes. Only fires when derived value actually changes. Returns unsubscribe. */
  subscribe(cb: (value: T) => void): () => void
  /** @internal brand for type discrimination */
  readonly __selectorBrand: true
}

/** Type guard for Selector objects. */
export function isSelector(value: unknown): value is Selector<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__selectorBrand' in value &&
    (value as Selector<unknown>).__selectorBrand === true
  )
}

/**
 * Create a memoized Selector from store primitives.
 *
 * - State identity check: same state object → skip re-computation
 * - Structural equality: new object with same values → keep previous reference
 * - Subscribe filter: only fires callback when derived value actually changes
 */
export function createSelector<TState, T>(
  getState: () => TState,
  storeSubscribe: (cb: (state: TState) => void) => () => void,
  selectorFn: (state: TState) => T,
): Selector<T> {
  let lastState: TState | undefined
  let lastResult: T
  let initialized = false

  function compute(): T {
    const currentState = getState()

    // State identity: same object → same result
    if (initialized && currentState === (lastState as unknown)) {
      return lastResult
    }

    const newResult = selectorFn(currentState)

    // Structural equality: keep previous reference if values match
    if (initialized && structuralEqual(lastResult, newResult)) {
      lastState = currentState
      return lastResult
    }

    lastState = currentState
    lastResult = newResult
    initialized = true
    return newResult
  }

  // Initialize eagerly
  compute()

  return {
    get: compute,

    subscribe(cb: (value: T) => void): () => void {
      return storeSubscribe(() => {
        const prev = lastResult
        const next = compute()
        if (prev !== next) {
          cb(next)
        }
      })
    },

    __selectorBrand: true as const,
  }
}
