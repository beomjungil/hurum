// @hurum/core — Events + Event

// Symbol used to brand event creators
const EVENT_CREATOR_BRAND = Symbol('hurum/event-creator')

/** Marker type for event payload definition */
export interface EventDefinition<T> {
  readonly __payload?: T
}

/** An event instance: has a `type` string and payload properties */
export type EventInstance<TType extends string = string, TPayload = unknown> = {
  readonly type: TType
} & TPayload

/** An event creator function that produces typed event instances */
export interface EventCreator<TType extends string = string, TPayload = unknown> {
  (payload: TPayload): EventInstance<TType, TPayload>
  readonly type: TType
  readonly [EVENT_CREATOR_BRAND]: true
}

/**
 * Define an event payload type. Used within `Events()` to declare event shapes.
 *
 * @example
 * ```ts
 * const MyEvent = Events('My', {
 *   happened: Event<{ value: number }>(),
 * })
 * ```
 */
export function Event<T = {}>(): EventDefinition<T> {
  return {} as EventDefinition<T>
}

// Type-level helper: Extract event creators from definition map
type EventCreatorMap<TPrefix extends string, TDefs extends Record<string, EventDefinition<unknown>>> = {
  readonly [K in keyof TDefs & string]: TDefs[K] extends EventDefinition<infer P>
    ? EventCreator<`${TPrefix}/${K}`, P>
    : never
}

/**
 * Create a namespaced group of event creators.
 *
 * @example
 * ```ts
 * const PurchaseEvent = Events('Purchase', {
 *   saved: Event<{ purchase: Purchase }>(),
 *   saveFailed: Event<{ error: Error }>(),
 * })
 *
 * PurchaseEvent.saved({ purchase }) // { type: 'Purchase/saved', purchase: ... }
 * PurchaseEvent.saved.type          // 'Purchase/saved' (string literal type)
 * ```
 */
export function Events<
  TPrefix extends string,
  TDefs extends Record<string, EventDefinition<unknown>>,
>(prefix: TPrefix, events: TDefs): EventCreatorMap<TPrefix, TDefs> {
  const result = {} as Record<string, unknown>

  for (const key of Object.keys(events)) {
    const type = `${prefix}/${key}` as const
    const creator = function (payload: unknown) {
      return { ...payload as object, type }
    } as EventCreator
    Object.defineProperty(creator, 'type', {
      value: type,
      writable: false,
      enumerable: true,
      configurable: false,
    })
    Object.defineProperty(creator, EVENT_CREATOR_BRAND, {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    })
    result[key] = creator
  }

  return result as EventCreatorMap<TPrefix, TDefs>
}

/** Check if a value is an event creator */
export function isEventCreator(value: unknown): value is EventCreator {
  return typeof value === 'function'
    && EVENT_CREATOR_BRAND in value
    && (value as Record<symbol, unknown>)[EVENT_CREATOR_BRAND] === true
}
