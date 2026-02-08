// @hurum/core/testing — TestReducer

import type { StoreDefinition, ResolvedState } from '../src/store'
import type { EventInstance } from '../src/events'

export interface TestReducerInstance<TRawState = unknown> {
  apply(state: ResolvedState<TRawState>, event: EventInstance): ResolvedState<TRawState>
}

/**
 * Create a test reducer for unit testing on handlers.
 * Applies an event to a given state and returns the new state.
 */
export function TestReducer<TDeps, TRawState, TComputed>(
  storeDef: StoreDefinition<TDeps, TRawState, TComputed>,
): TestReducerInstance<TRawState> {
  const config = storeDef.__config

  return {
    apply(state: ResolvedState<TRawState>, event: EventInstance): ResolvedState<TRawState> {
      const handler = config.on?.[event.type]
      if (!handler) {
        return state
      }

      const { type: _type, ...payload } = event
      return handler(
        state as Record<string, unknown>,
        payload as Record<string, unknown>,
      ) as ResolvedState<TRawState>
    },
  }
}
