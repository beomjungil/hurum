// @hurum/core — Intent + Intents

import type { Command } from './command-executor'
import type { EventCreator } from './events'

// Branding symbols
const INTENT_BRAND = Symbol('hurum/intent')
const INTENTS_BRAND = Symbol('hurum/intents')
const PREPARED_INTENT_BRAND = Symbol('hurum/prepared-intent')

/** Execution mode for an intent */
export type IntentMode = 'sequential' | 'all' | 'allSettled'

/** A single step within an intent: either a Command (with registered executor) or an EventCreator (emitted directly). */
export type IntentStep<TInput = unknown> = Command<TInput> | EventCreator<string, TInput>

/** An intent descriptor: references steps (commands and/or event creators) and their execution mode */
export interface IntentDescriptor<TInput = unknown> {
  readonly [INTENT_BRAND]: true
  // EventCreator payload is type-erased (any) to preserve covariance for IntentDescriptor<T> → IntentDescriptor<unknown>.
  // Type safety is enforced at the Intent() factory level via IntentStep<TInput>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly steps: ReadonlyArray<Command<TInput> | EventCreator<string, any>>
  readonly mode: IntentMode
  readonly name?: string
  readonly __inputType?: TInput
}

/** A callable intent descriptor. Calling with payload produces a PreparedIntent. */
export interface IntentAction<TInput = unknown> extends IntentDescriptor<TInput> {
  (payload: TInput): PreparedIntent<TInput>
}

/** An intent paired with its payload, ready to dispatch via store.send(). */
export interface PreparedIntent<TInput = unknown> {
  readonly [PREPARED_INTENT_BRAND]: true
  readonly intent: IntentDescriptor<TInput>
  readonly payload: TInput
}

/** An intents container: a namespaced group of intent descriptors */
export interface IntentsContainer {
  readonly [INTENTS_BRAND]: true
  readonly __prefix: string
}

/** @internal Helper to create an IntentAction from descriptor properties */
function createIntentAction<TInput>(mode: IntentMode, steps: IntentStep<TInput>[]): IntentAction<TInput> {
  const action = function (payload: TInput): PreparedIntent<TInput> {
    return {
      [PREPARED_INTENT_BRAND]: true,
      intent: action as IntentDescriptor<TInput>,
      payload,
    }
  } as IntentAction<TInput>

  Object.defineProperty(action, INTENT_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  Object.defineProperty(action, 'steps', {
    value: steps,
    writable: false,
    enumerable: true,
    configurable: false,
  })
  Object.defineProperty(action, 'mode', {
    value: mode,
    writable: false,
    enumerable: true,
    configurable: false,
  })
  // Override Function.name — will be set by Intents() builder
  Object.defineProperty(action, 'name', {
    value: undefined,
    writable: false,
    enumerable: true,
    configurable: true,
  })

  return action
}

/**
 * Create a callable intent with sequential execution (default).
 * If any step throws, subsequent steps are skipped.
 *
 * Accepts Commands (executed via registered executors) and/or EventCreators (emitted directly).
 *
 * @example
 * ```ts
 * const MyIntents = Intents('Purchase', {
 *   submitClicked: Intent(ValidateCommand, SaveCommand),
 *   pageOpened: Intent(LoadCommand),
 *   // EventCreator directly — no Command/Executor boilerplate needed
 *   titleChanged: Intent(FormEvent.titleChanged),
 * })
 *
 * // Call to create a PreparedIntent
 * store.send(MyIntents.submitClicked({ formData }))
 *
 * // Or use shorthand
 * store.send.submitClicked({ formData })
 * ```
 */
export function Intent<TInput>(...steps: IntentStep<TInput>[]): IntentAction<TInput> {
  return createIntentAction('sequential', steps)
}

/**
 * Create a parallel fail-fast intent. All steps run in parallel.
 * If one fails, the rest are aborted via signal.
 */
Intent.all = function all<TInput>(...steps: IntentStep<TInput>[]): IntentAction<TInput> {
  return createIntentAction('all', steps)
}

/**
 * Create a parallel independent intent. All steps run in parallel.
 * Each runs independently; failures don't affect others.
 */
Intent.allSettled = function allSettled<TInput>(...steps: IntentStep<TInput>[]): IntentAction<TInput> {
  return createIntentAction('allSettled', steps)
}

/**
 * Create a namespaced group of intents.
 *
 * @example
 * ```ts
 * const PurchaseIntents = Intents('Purchase', {
 *   submitClicked: Intent(ValidateCommand, SaveCommand),
 *   pageOpened: Intent(LoadCommand),
 * })
 * ```
 */
export function Intents<
  TPrefix extends string,
  TDefs extends Record<string, IntentDescriptor>,
>(prefix: TPrefix, intents: TDefs): TDefs & IntentsContainer {
  const container = { ...intents } as TDefs & IntentsContainer

  // Set name on each IntentDescriptor: `${prefix}/${key}`
  for (const [key, descriptor] of Object.entries(container)) {
    if (isIntentDescriptor(descriptor)) {
      Object.defineProperty(descriptor, 'name', {
        value: `${prefix}/${key}`,
        writable: false,
        enumerable: true,
        configurable: false,
      })
    }
  }

  Object.defineProperty(container, INTENTS_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  Object.defineProperty(container, '__prefix', {
    value: prefix,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  return container
}

/** Check if a value is an IntentDescriptor (plain object or callable IntentAction) */
export function isIntentDescriptor(value: unknown): value is IntentDescriptor {
  return (typeof value === 'object' || typeof value === 'function') && value !== null && INTENT_BRAND in value
}

/** Check if a value is an IntentsContainer */
export function isIntentsContainer(value: unknown): value is IntentsContainer {
  return typeof value === 'object' && value !== null && INTENTS_BRAND in value
}

/** Check if a value is a PreparedIntent (intent + payload pair) */
export function isPreparedIntent(value: unknown): value is PreparedIntent {
  return typeof value === 'object' && value !== null && PREPARED_INTENT_BRAND in value
}
