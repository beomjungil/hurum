// @hurum/core — Middleware type

import type { EventInstance } from './events'
import type { IntentDescriptor } from './intent'
import type { Command } from './command-executor'

/**
 * Middleware interface for observing store lifecycle events.
 * Middlewares are pure observers — they must NOT modify state or emit events.
 *
 * @example
 * ```ts
 * const myMiddleware: Middleware = {
 *   name: 'my-middleware',
 *   onEvent: (event, state) => console.log(event.type, state),
 *   onError: (error) => reportError(error),
 * }
 * ```
 */
export type Middleware = {
  /** Unique name for this middleware instance */
  name: string
  /** Called when the middleware is attached to a store instance (during Store.create or singleton init). */
  onAttach?: (store: {
    getState: () => Record<string, unknown>
    meta?: {
      computedKeys?: readonly string[]
      nestedKeys?: readonly { key: string; kind: 'single' | 'array' | 'map' }[]
    }
  }) => void
  /** Called when an event is applied to the store */
  onEvent?: (event: EventInstance, state: Record<string, unknown>) => void
  /** Called after state changes, with previous and next state */
  onStateChange?: (prev: Record<string, unknown>, next: Record<string, unknown>) => void
  /** Called when an intent starts execution */
  onIntentStart?: (intent: IntentDescriptor, payload: unknown) => void
  /** Called when an intent finishes execution */
  onIntentEnd?: (intent: IntentDescriptor, payload: unknown) => void
  /** Called when an executor throws an error */
  onError?: (error: Error, context: { intent: IntentDescriptor; payload?: unknown; command?: Command }) => void
}

/**
 * Factory for creating typed middleware instances.
 * The `.create()` method is called by the store builder to produce
 * a concrete Middleware. This pattern avoids the need for generic
 * type parameters at middleware definition time.
 *
 * @example
 * ```ts
 * function myMiddleware(options?: MyOptions): MiddlewareFactory {
 *   return {
 *     name: 'my-middleware',
 *     create() {
 *       return {
 *         name: 'my-middleware',
 *         onEvent: (event, state) => console.log(event.type, state),
 *       }
 *     },
 *   }
 * }
 * ```
 */
export interface MiddlewareFactory {
  create(): Middleware
  readonly name: string
}
