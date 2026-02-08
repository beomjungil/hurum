// @hurum/core/testing — TestStore

import type { StoreDefinition, StoreCreateOptions, StoreInternalFields, StoreInstance, ResolvedState, SendFn } from '../src/store'
import type { IntentDescriptor, PreparedIntent } from '../src/intent'
import type { EventInstance } from '../src/events'
import { structuralEqual } from '../src/computed'

/** Async version of SendFn for test store — each call flushes microtasks before resolving. */
export type TestSendFn<TIntents extends Record<string, unknown> = Record<string, never>> = {
  <TInput>(prepared: PreparedIntent<TInput>): Promise<void>
  <TInput>(intent: IntentDescriptor<TInput>, payload: TInput): Promise<void>
} & {
  readonly [K in keyof TIntents]: (payload: TIntents[K]) => Promise<void>
}

export interface TestStoreInstance<TRawState = unknown, TComputed = unknown, TIntents extends Record<string, unknown> = Record<string, never>> {
  send: TestSendFn<TIntents>
  getState(): ResolvedState<TRawState> & TComputed
  /** Access nested child store instances via scope. */
  readonly scope: StoreInstance<unknown, TRawState, TComputed>['scope']
  assertState(expected: Partial<ResolvedState<TRawState> & TComputed>): void
  assertEvents(expected: EventInstance[]): void
  assertEventSequence(
    expected: Array<{ event: EventInstance; state: Partial<ResolvedState<TRawState> & TComputed> }>,
  ): void
  assertNoRunningExecutors(): void
}

/**
 * Create a test store for integration testing.
 * Wraps `Store.create()` with testing utilities.
 */
export function TestStore<TDeps, TRawState, TComputed, TIntents extends Record<string, unknown> = Record<string, never>>(
  storeDef: StoreDefinition<TDeps, TRawState, TComputed, TIntents>,
  options?: StoreCreateOptions<TRawState, TDeps>,
): TestStoreInstance<TRawState, TComputed, TIntents> {
  const instance = storeDef.create(options) as StoreInstance<TDeps, TRawState, TComputed, TIntents> & StoreInternalFields

  // Create async test send that wraps the real send proxy
  const instanceSend = instance.send as SendFn<TIntents>

  const testSendBase = async (...args: unknown[]): Promise<void> => {
    ;(instanceSend as Function)(...args)
    await flushMicrotasks()
  }

  const testSend = new Proxy(testSendBase as TestSendFn<TIntents>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      // Prevent thenable detection (would break await)
      if (prop === 'then') return undefined
      // Standard function properties
      if (prop === 'bind' || prop === 'call' || prop === 'apply' || prop === 'length' || prop === 'name' || prop === 'prototype')
        return (testSendBase as unknown as Record<string, unknown>)[prop]
      // Delegate to instance.send's proxy for intent lookup
      const shortcut = (instanceSend as unknown as Record<string, unknown>)[prop]
      if (typeof shortcut === 'function') {
        return async (payload: unknown) => {
          ;(shortcut as Function)(payload)
          await flushMicrotasks()
        }
      }
      return undefined
    },
  })

  return {
    send: testSend,

    getState(): ResolvedState<TRawState> & TComputed {
      return instance.getState()
    },

    get scope() {
      return instance.scope
    },

    assertState(expected: Partial<ResolvedState<TRawState> & TComputed>): void {
      const state = instance.getState() as Record<string, unknown>
      for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
        if (!structuralEqual(state[key], value)) {
          throw new Error(
            `State mismatch for key "${key}":\n` +
            `  Expected: ${JSON.stringify(value)}\n` +
            `  Received: ${JSON.stringify(state[key])}`,
          )
        }
      }
    },

    assertEvents(expected: EventInstance[]): void {
      const actual = instance.__eventLog
      if (actual.length !== expected.length) {
        throw new Error(
          `Event count mismatch:\n` +
          `  Expected ${expected.length} events: [${expected.map((e) => e.type).join(', ')}]\n` +
          `  Received ${actual.length} events: [${actual.map((e) => e.type).join(', ')}]`,
        )
      }
      for (let i = 0; i < expected.length; i++) {
        const exp = expected[i]!
        const act = actual[i]!
        if (!structuralEqual(exp, act)) {
          throw new Error(
            `Event mismatch at index ${i}:\n` +
            `  Expected: ${JSON.stringify(exp)}\n` +
            `  Received: ${JSON.stringify(act)}`,
          )
        }
      }
    },

    assertEventSequence(
      expected: Array<{ event: EventInstance; state: Partial<ResolvedState<TRawState> & TComputed> }>,
    ): void {
      const snapshots = instance.__stateSnapshots

      for (const { event: expectedEvent, state: expectedState } of expected) {
        // Find the snapshot matching this event
        const snapshot = snapshots.find((s) => structuralEqual(s.event, expectedEvent))
        if (!snapshot) {
          throw new Error(
            `Expected event not found in sequence:\n` +
            `  ${JSON.stringify(expectedEvent)}`,
          )
        }

        for (const [key, value] of Object.entries(expectedState as Record<string, unknown>)) {
          if (!structuralEqual(snapshot.state[key], value)) {
            throw new Error(
              `State mismatch after event "${expectedEvent.type}" for key "${key}":\n` +
              `  Expected: ${JSON.stringify(value)}\n` +
              `  Received: ${JSON.stringify(snapshot.state[key])}`,
            )
          }
        }
      }
    },

    assertNoRunningExecutors(): void {
      const count = instance.__runningCount()
      if (count > 0) {
        throw new Error(
          `Expected no running executors, but ${count} are still running`,
        )
      }
    },
  }
}

async function flushMicrotasks(): Promise<void> {
  // Flush several rounds of microtasks to ensure all async work completes
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}
