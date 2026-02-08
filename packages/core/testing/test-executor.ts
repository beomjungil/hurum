// @hurum/core/testing — TestExecutor

import type { Executor } from '../src/command-executor'
import { getExecutorFn } from '../src/command-executor'
import type { EventInstance } from '../src/events'
import { structuralEqual } from '../src/computed'

export interface TestExecutorInstance<TInput = unknown> {
  run(input: TInput): Promise<void>
  abort(): void
  assertEmitted(expected: EventInstance[]): void
  readonly emittedEvents: EventInstance[]
}

export interface TestExecutorOptions {
  deps?: Record<string, unknown>
  state?: Record<string, unknown>
}

/**
 * Create a test executor for unit testing.
 * Runs the executor function in isolation with mock context.
 */
export function TestExecutor<TInput>(
  executor: Executor<TInput>,
  options?: TestExecutorOptions,
): TestExecutorInstance<TInput> {
  const fn = getExecutorFn(executor)
  const emittedEvents: EventInstance[] = []
  const abortController = new AbortController()

  const state = options?.state ?? {}

  function emit(event: EventInstance): void {
    emittedEvents.push(event)
  }

  return {
    async run(input: TInput): Promise<void> {
      const context = {
        deps: options?.deps ?? {},
        emit,
        getState: () => state,
        signal: abortController.signal,
        scope: {},
      }

      const result = (fn as (input: TInput, ctx: typeof context) => void | Promise<void>)(input, context)
      if (result instanceof Promise) {
        await result
      }
    },

    abort(): void {
      abortController.abort()
    },

    assertEmitted(expected: EventInstance[]): void {
      if (emittedEvents.length !== expected.length) {
        throw new Error(
          `Emitted event count mismatch:\n` +
          `  Expected ${expected.length} events: [${expected.map((e) => e.type).join(', ')}]\n` +
          `  Received ${emittedEvents.length} events: [${emittedEvents.map((e) => e.type).join(', ')}]`,
        )
      }
      for (let i = 0; i < expected.length; i++) {
        const exp = expected[i]!
        const act = emittedEvents[i]!
        if (!structuralEqual(exp, act)) {
          throw new Error(
            `Emitted event mismatch at index ${i}:\n` +
            `  Expected: ${JSON.stringify(exp)}\n` +
            `  Received: ${JSON.stringify(act)}`,
          )
        }
      }
    },

    get emittedEvents() {
      return emittedEvents
    },
  }
}
