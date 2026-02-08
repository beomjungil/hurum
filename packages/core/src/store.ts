// @hurum/core — Store

import type { EventCreator, EventInstance } from './events'
import { isEventCreator } from './events'
import type { Command, Executor } from './command-executor'
import { getCommandId, getExecutorCommand, getExecutorFn } from './command-executor'
import type { IntentDescriptor, IntentsContainer, PreparedIntent } from './intent'
import { isIntentDescriptor, isPreparedIntent } from './intent'
import type { ComputedNode } from './computed'
import { initializeComputedNodes, evaluateComputedNodes } from './computed'
import type { NestedMarker, NestedKind } from './nested'
import { isNestedMarker } from './nested'
import type { Middleware, MiddlewareFactory } from './middleware'
import type { Selector } from './selector'
import { createSelector } from './selector'

// ── Constants ───────────────────────────────────────────────────────

const STORE_DEF_BRAND = Symbol('hurum/store-def')
const STORE_INSTANCE_BRAND = Symbol('hurum/store-instance')
const IS_DEV = typeof globalThis !== 'undefined'
  && typeof (globalThis as { process?: { env?: Record<string, string> } }).process !== 'undefined'
  && (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.['NODE_ENV'] !== 'production'
const MAX_RELAY_DEPTH = 5

// ── Type Utilities ────────────────────────────────────────────────

/** Resolve nested markers in raw state to their runtime types (includes child computed) */
export type ResolvedState<T> = {
  [K in keyof T]:
    T[K] extends NestedMarker<infer S, 'single'> ? ResolvedStateOf<S> :
    T[K] extends NestedMarker<infer S, 'array'> ? ResolvedStateOf<S>[] :
    T[K] extends NestedMarker<infer S, 'map'> ? Record<string, ResolvedStateOf<S>> :
    T[K]
}

/** Extract resolved state (raw + computed) from a store definition */
export type ResolvedStateOf<S> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends StoreDefinition<any, infer R, infer C>
    ? C extends Record<string, never>
      ? ResolvedState<R>
      : ResolvedState<R> & C
    : never

/** Resolve nested markers to raw state only (no child computed). Used for on() handlers. */
export type ReducerState<T> = {
  [K in keyof T]:
    T[K] extends NestedMarker<infer S, 'single'> ? ReducerStateOf<S> :
    T[K] extends NestedMarker<infer S, 'array'> ? ReducerStateOf<S>[] :
    T[K] extends NestedMarker<infer S, 'map'> ? Record<string, ReducerStateOf<S>> :
    T[K]
}

/** Extract raw state (without computed) from a store definition */
export type ReducerStateOf<S> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends StoreDefinition<any, infer R, any>
    ? ReducerState<R>
    : never

/** Extract typed scope from raw state: maps nested keys to their store instance types */
export type ScopeOf<T> = {
  [K in keyof T as T[K] extends NestedMarker ? K : never]:
    T[K] extends NestedMarker<infer S, 'single'> ? StoreInstanceOf<S> :
    T[K] extends NestedMarker<infer S, 'array'> ? NestedArrayScope<StoreInstanceOf<S>> :
    T[K] extends NestedMarker<infer S, 'map'> ? Map<string, StoreInstanceOf<S>> :
    never
}

/** Scope type for Nested.array — supports ID-based O(1) lookup */
export interface NestedArrayScope<T extends StoreInstance = StoreInstance> {
  /** O(1) lookup by the child's state.id */
  get(id: string): T | undefined
  /** Returns all child instances as an array */
  values(): T[]
  /** Number of child instances */
  readonly size: number
  [Symbol.iterator](): Iterator<T>
}

/** Extract store instance type from a store definition */
type StoreInstanceOf<S> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends StoreDefinition<infer D, infer R, infer C, infer I>
    ? StoreInstance<D, R, C, I>
    : never

/** Extract intent key → input type mapping from an IntentsContainer */
export type IntentMap<T> = {
  [K in keyof T as T[K] extends IntentDescriptor ? K : never]:
    T[K] extends IntentDescriptor<infer TInput> ? TInput : never
}

/** The send function type: callable (2 overloads) + named intent shorthand properties */
export type SendFn<TIntents extends Record<string, unknown> = Record<string, never>> = {
  /** Send a PreparedIntent (from calling an IntentAction) */
  <TInput>(prepared: PreparedIntent<TInput>): IntentRef
  /** Send an IntentDescriptor with explicit payload (legacy) */
  <TInput>(intent: IntentDescriptor<TInput>, payload: TInput): IntentRef
} & {
  /** Named intent shortcuts: store.send.intentName(payload) */
  readonly [K in keyof TIntents]: (payload: TIntents[K]) => IntentRef
}

/** Extract child store deps type from a nested marker */
export type ChildDepsOf<T> =
  T extends NestedMarker<infer S, NestedKind>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? S extends StoreDefinition<infer D, any, any> ? D : Record<string, never>
    : Record<string, never>

/** Handler map for namespace-style .on() */
export type EventHandlerMap<TNamespace, TState> = {
  [K in keyof TNamespace]?: TNamespace[K] extends EventCreator<string, infer P>
    ? (state: TState, payload: P) => TState
    : never
}

/** Handler map for namespace-style .on() — state input includes computed, return is raw only */
type ReducerEventHandlerMap<TNamespace, TStateIn, TStateOut> = {
  [K in keyof TNamespace]?: TNamespace[K] extends EventCreator<string, infer P>
    ? (state: TStateIn, payload: P) => TStateOut
    : never
}

// ── Public Types ────────────────────────────────────────────────────

/** Opaque reference returned by `store.send()` for cancellation via `store.cancel(ref)`. */
export interface IntentRef {
  readonly __intentRefBrand: symbol
}

export interface NestedMeta {
  source: {
    instanceId: string
    index: number
    parentKey: string
  }
}

// ── Internal handler types (for runtime storage) ──

type InternalOnHandler = (state: Record<string, unknown>, payload: Record<string, unknown>, meta?: NestedMeta) => Record<string, unknown>
type InternalOnHandlerMap = Record<string, InternalOnHandler>
type InternalRelayHandler = (event: EventInstance, state: Record<string, unknown>) => EventInstance[]
type InternalRelayMap = Record<string, InternalRelayHandler>

/** Internal configuration accumulated by StoreBuilder. */
export interface StoreConfig<TDeps = unknown, TState = unknown, TComputed = unknown> {
  intents?: IntentsContainer
  executors?: Executor[]
  state: TState
  computed?: Record<string, (state: Record<string, unknown>) => unknown>
  on?: InternalOnHandlerMap
  relay?: InternalRelayMap
  middleware?: Middleware[]
  childDepsMap?: Record<string, (parentDeps: Record<string, unknown>) => Record<string, unknown>>
  /** @internal phantom type for computed inference */
  readonly __computedPhantom?: TComputed
  /** @internal phantom type for deps inference */
  readonly __depsPhantom?: TDeps
}

/** Options for `StoreDefinition.create()`. Supports initial state override and deps injection. */
export interface StoreCreateOptions<TRawState = unknown, TDeps = unknown> {
  initialState?: Partial<ResolvedState<TRawState>>
  deps?: Partial<TDeps>
}

/** A store definition (blueprint). Call `.create()` to instantiate. */
export interface StoreDefinition<TDeps = unknown, TRawState = unknown, TComputed = unknown, TIntents extends Record<string, unknown> = Record<string, never>> {
  readonly [STORE_DEF_BRAND]: true
  readonly __config: StoreConfig<TDeps, TRawState, TComputed>
  readonly __stateType?: ResolvedState<TRawState> & TComputed
  readonly __rawStateType?: TRawState
  readonly __depsType?: TDeps
  readonly __intentsType?: TIntents
  create(options?: StoreCreateOptions<TRawState, TDeps>): StoreInstance<TDeps, TRawState, TComputed, TIntents>
}

/** A live store instance. Created by `StoreDefinition.create()`. */
export interface StoreInstance<TDeps = unknown, TRawState = unknown, TComputed = unknown, TIntents extends Record<string, unknown> = Record<string, never>> {
  /** Dispatch intents. Callable with PreparedIntent or (descriptor, payload). Also supports store.send.intentName(payload) shorthand. */
  send: SendFn<TIntents>
  /** Cancel a specific running intent by its ref. */
  cancel(ref: IntentRef): void
  /** Cancel all running intents. */
  cancelAll(): void
  /** Get the current combined state (raw + computed). */
  getState(): ResolvedState<TRawState> & TComputed
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(cb: (state: ResolvedState<TRawState> & TComputed) => void): () => void
  /** Subscribe to raw event emissions. Returns an unsubscribe function. */
  subscribe(type: 'events', cb: (event: EventInstance) => void): () => void
  /** Dispose the store, cancelling all intents and clearing listeners. */
  dispose(): void
  /** Create a memoized derived state selector. */
  selector<T>(fn: (state: ResolvedState<TRawState> & TComputed) => T): Selector<T>
  /** Nested store scope for accessing child store instances. */
  readonly scope: ScopeOf<TRawState>
  /** @internal phantom type for deps inference */
  readonly __depsPhantom?: TDeps
}

// ── Internal types for testing ──────────────────────────────────────

export interface StoreInternalFields {
  __eventLog: EventInstance[]
  __stateSnapshots: Array<{ event: EventInstance; state: Record<string, unknown> }>
  __runningCount: () => number
  __rawState: () => Record<string, unknown>
  /** Apply event to this store (for event forwarding from parent to children). */
  __applyEvent: (event: EventInstance, options?: { skipEventLog?: boolean }) => void
  /** Execute a single command (for parent → child delegation). */
  __executeCommand: (command: Command, payload: unknown, signal: AbortSignal) => Promise<void>
  /** Returns the nestedExecutorIndex for recursive delegation (root → child → grandchild). */
  __getHandleableCommands: () => Map<symbol, StoreInstance & StoreInternalFields>
}

/** @deprecated Use StoreInstance & StoreInternalFields instead */
export type StoreInstanceInternal = StoreInstance & StoreInternalFields

// ── Deep Merge ──────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(override) as Array<keyof T & string>) {
    const baseVal = base[key]
    const overVal = override[key]
    if (isPlainObject(baseVal) && isPlainObject(overVal)) {
      result[key] = deepMerge(baseVal, overVal as Partial<typeof baseVal>) as T[typeof key]
    } else if (overVal !== undefined) {
      result[key] = overVal as T[keyof T & string]
    }
  }
  return result
}

// ── StoreBuilder ────────────────────────────────────────────────────

interface BuilderConfig {
  state: Record<string, unknown>
  on?: InternalOnHandlerMap
  computed?: Record<string, (state: Record<string, unknown>) => unknown>
  intents?: IntentsContainer
  executors?: Executor[]
  relay?: InternalRelayMap
  middleware?: Middleware[]
  childDepsMap?: Record<string, (parentDeps: Record<string, unknown>) => Record<string, unknown>>
}

/** The return type of Store() — a builder that is also a StoreDefinition. */
export type StoreBuilder<
  TDeps extends Record<string, unknown>,
  TRawState extends Record<string, unknown>,
  TComputed extends Record<string, unknown>,
  TIntents extends Record<string, unknown> = Record<string, never>,
> = {
  // ── on() overloads ──

  /** Per-event handler: full payload type inference from EventCreator */
  on<TType extends string, TPayload>(
    event: EventCreator<TType, TPayload>,
    handler: (state: ResolvedState<TRawState>, payload: TPayload) => ReducerState<TRawState>,
  ): StoreBuilder<TDeps, TRawState, TComputed, TIntents>

  /** Namespace handler: grouped handlers with per-key payload type inference */
  on<TNamespace extends object>(
    events: TNamespace,
    handlers: ReducerEventHandlerMap<TNamespace, ResolvedState<TRawState>, ReducerState<TRawState>>,
  ): StoreBuilder<TDeps, TRawState, TComputed, TIntents>

  // ── computed() ──
  computed<C extends Record<string, (state: ResolvedState<TRawState>) => unknown>>(
    def: C,
  ): StoreBuilder<TDeps, TRawState, { [K in keyof C]: ReturnType<C[K]> }, TIntents>

  // ── intents / executors ──
  intents<TContainer extends IntentsContainer>(
    container: TContainer,
  ): StoreBuilder<TDeps, TRawState, TComputed, TIntents & IntentMap<TContainer>>
  executors(...execs: Executor[]): StoreBuilder<TDeps, TRawState, TComputed, TIntents>

  // ── deps ──
  deps<D extends Record<string, unknown>>(): StoreBuilder<D, TRawState, TComputed, TIntents>

  // ── childDeps ──
  childDeps<K extends keyof TRawState & string>(
    key: K,
    mapper: (deps: TDeps) => ChildDepsOf<TRawState[K]>,
  ): StoreBuilder<TDeps, TRawState, TComputed, TIntents>

  // ── relay() overloads ──

  /** Per-event relay: transform one event type into other events */
  relay<TType extends string, TPayload>(
    event: EventCreator<TType, TPayload>,
    handler: (event: EventInstance<TType, TPayload>, state: ResolvedState<TRawState>) => EventInstance[],
  ): StoreBuilder<TDeps, TRawState, TComputed, TIntents>

  // ── middleware ──
  middleware(...mws: (Middleware | MiddlewareFactory)[]): StoreBuilder<TDeps, TRawState, TComputed, TIntents>

  // ── create ──
  create(options?: StoreCreateOptions<TRawState, TDeps>): StoreInstance<TDeps, TRawState, TComputed, TIntents>
} & StoreDefinition<TDeps, TRawState, TComputed, TIntents>

function createBuilder<
  TDeps extends Record<string, unknown>,
  TRawState extends Record<string, unknown>,
  TComputed extends Record<string, unknown>,
  TIntents extends Record<string, unknown> = Record<string, never>,
>(cfg: BuilderConfig): StoreBuilder<TDeps, TRawState, TComputed, TIntents> {
  function buildConfig(): StoreConfig<TDeps, TRawState, TComputed> {
    return {
      state: cfg.state as TRawState,
      on: cfg.on,
      computed: cfg.computed,
      intents: cfg.intents,
      executors: cfg.executors,
      relay: cfg.relay,
      middleware: cfg.middleware,
      childDepsMap: cfg.childDepsMap,
    }
  }

  function doCreate(options?: StoreCreateOptions<TRawState, TDeps>): StoreInstance<TDeps, TRawState, TComputed, TIntents> {
    const config = buildConfig()
    const rawStateTemplate: Record<string, unknown> = {}
    const nestedFields: Record<string, NestedMarker> = {}

    for (const [key, value] of Object.entries(config.state as Record<string, unknown>)) {
      if (isNestedMarker(value)) {
        nestedFields[key] = value
      } else {
        rawStateTemplate[key] = value
      }
    }

    return createStoreInstance(config, rawStateTemplate, nestedFields, options)
  }

  const builder = {
    on(eventOrNamespace: EventCreator | Record<string, EventCreator>, handlerOrMap: Function | Record<string, Function>) {
      const newHandlers: InternalOnHandlerMap = {}

      if (isEventCreator(eventOrNamespace)) {
        // Per-event overload
        const event = eventOrNamespace
        newHandlers[event.type] = handlerOrMap as InternalOnHandler
      } else {
        // Namespace overload
        const namespace = eventOrNamespace as Record<string, EventCreator>
        const handlers = handlerOrMap as Record<string, Function>
        for (const key of Object.keys(handlers)) {
          const eventCreator = namespace[key]
          if (eventCreator && typeof eventCreator === 'function' && 'type' in eventCreator) {
            newHandlers[(eventCreator as EventCreator).type] = handlers[key] as InternalOnHandler
          }
        }
      }

      return createBuilder<TDeps, TRawState, TComputed>({
        ...cfg,
        on: { ...cfg.on, ...newHandlers },
      })
    },

    computed<C extends Record<string, (state: ResolvedState<TRawState>) => unknown>>(def: C) {
      return createBuilder<TDeps, TRawState, { [K in keyof C]: ReturnType<C[K]> }>({
        ...cfg,
        computed: { ...cfg.computed, ...def as Record<string, (state: Record<string, unknown>) => unknown> },
      })
    },

    intents(container: IntentsContainer) {
      return createBuilder({
        ...cfg,
        intents: container,
      })
    },

    executors(...execs: Executor[]) {
      return createBuilder<TDeps, TRawState, TComputed>({
        ...cfg,
        executors: [...(cfg.executors ?? []), ...execs],
      })
    },

    deps<D extends Record<string, unknown>>() {
      return createBuilder<D, TRawState, TComputed>({ ...cfg })
    },

    childDeps<K extends keyof TRawState & string>(
      key: K,
      mapper: (deps: TDeps) => ChildDepsOf<TRawState[K]>,
    ) {
      return createBuilder<TDeps, TRawState, TComputed>({
        ...cfg,
        childDepsMap: {
          ...cfg.childDepsMap,
          [key]: mapper as (parentDeps: Record<string, unknown>) => Record<string, unknown>,
        },
      })
    },

    relay(event: EventCreator, handler: (event: EventInstance, state: Record<string, unknown>) => EventInstance[]) {
      return createBuilder<TDeps, TRawState, TComputed>({
        ...cfg,
        relay: { ...cfg.relay, [event.type]: handler as InternalRelayHandler },
      })
    },

    middleware(...mws: (Middleware | MiddlewareFactory)[]) {
      const resolvedMws: Middleware[] = mws.map((mw) => {
        if ('create' in mw && typeof mw.create === 'function') {
          return (mw as MiddlewareFactory).create()
        }
        return mw as Middleware
      })
      return createBuilder<TDeps, TRawState, TComputed>({
        ...cfg,
        middleware: [...(cfg.middleware ?? []), ...resolvedMws],
      })
    },

    create: doCreate,
  }

  // Brand the builder as a StoreDefinition
  Object.defineProperty(builder, STORE_DEF_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  Object.defineProperty(builder, '__config', {
    get: buildConfig,
    enumerable: false,
    configurable: false,
  })

  return builder as StoreBuilder<TDeps, TRawState, TComputed, TIntents>
}

// ── Store Factory ───────────────────────────────────────────────────

/**
 * Create a store builder from an initial state.
 * Returns a chainable builder with `.on()`, `.computed()`, `.intents()`,
 * `.executors()`, `.deps()`, `.childDeps()`, `.relay()`, `.middleware()`, and `.create()`.
 *
 * The builder is also a `StoreDefinition` — you can call `.create()` directly
 * or pass it to testing APIs like `TestStore()`, `TestReducer()`, etc.
 *
 * @example
 * ```ts
 * const CounterStore = Store({ state: { count: 0, multiplier: 2 } })
 *   .on(CounterEvent.incremented, (state, { amount }) => ({
 *     ...state, count: state.count + amount,
 *   }))
 *   .computed({
 *     doubled: (state) => state.count * 2,
 *     product: (state) => state.count * state.multiplier,
 *   })
 *   .intents(CounterIntents)
 *   .executors(IncrementExecutor, DecrementExecutor)
 *   .middleware(logger())
 *
 * const store = CounterStore.create()
 * store.send(CounterIntents.increment, {})
 * ```
 */
export function Store<
  TState extends Record<string, unknown>,
>(config: { state: TState }): StoreBuilder<Record<string, never>, TState, Record<string, never>> {
  return createBuilder<Record<string, never>, TState, Record<string, never>>({
    state: config.state as Record<string, unknown>,
  })
}

export function isStoreDefinition(value: unknown): value is StoreDefinition {
  return typeof value === 'object' && value !== null && STORE_DEF_BRAND in value
}

export function isStoreInstance(value: unknown): value is StoreInstance {
  return typeof value === 'object' && value !== null && STORE_INSTANCE_BRAND in value
}

// ── Nested Store Management ─────────────────────────────────────────

interface NestedSingleManager {
  kind: 'single'
  key: string
  marker: NestedMarker
  instance: StoreInstance | null
  unsub: (() => void) | null
}

interface NestedArrayManager {
  kind: 'array'
  key: string
  marker: NestedMarker
  instances: Map<string, { instance: StoreInstance; unsub: () => void }>
}

interface NestedMapManager {
  kind: 'map'
  key: string
  marker: NestedMarker
  instances: Map<string, { instance: StoreInstance; unsub: () => void }>
}

type NestedManager = NestedSingleManager | NestedArrayManager | NestedMapManager

let instanceIdCounter = 0
function nextInstanceId(): string {
  return `nested-${++instanceIdCounter}`
}

// ── Send Proxy Factory ──────────────────────────────────────────────

function createSendProxy(
  send: (intentOrPrepared: IntentDescriptor | PreparedIntent, payload?: unknown) => IntentRef,
  intentsContainer?: IntentsContainer,
): SendFn {
  // Build intent name → descriptor lookup from the container
  const intentLookup = new Map<string, IntentDescriptor>()
  if (intentsContainer) {
    for (const [key, value] of Object.entries(intentsContainer)) {
      if (isIntentDescriptor(value)) {
        intentLookup.set(key, value)
      }
    }
  }

  const boundIntents = new Map<string, (payload: unknown) => IntentRef>()

  return new Proxy(send as SendFn, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined

      // Preserve standard function properties
      if (prop === 'bind' || prop === 'call' || prop === 'apply' || prop === 'length' || prop === 'name' || prop === 'prototype') {
        return (send as unknown as Record<string, unknown>)[prop]
      }

      let bound = boundIntents.get(prop)
      if (!bound) {
        const descriptor = intentLookup.get(prop)
        if (!descriptor) {
          if (IS_DEV) {
            console.warn(`[hurum] No intent named "${prop}" registered on this store.`)
          }
          return undefined
        }
        bound = (payload: unknown) => send(descriptor, payload)
        boundIntents.set(prop, bound)
      }
      return bound
    },
    apply(_target, _thisArg, args) {
      return send(args[0] as IntentDescriptor | PreparedIntent, args[1])
    },
  })
}

// ── Nested single safe default ──────────────────────────────────────

/**
 * Recursively resolve initial state for a Nested(single) store definition.
 * Used to provide safe defaults during computed initialization so that
 * computed functions can access nested state properties without null errors.
 */
function resolveNestedSingleDefaults(marker: NestedMarker): Record<string, unknown> {
  const childDef = marker.store as StoreDefinition
  const childState = (childDef.__config as StoreConfig).state as Record<string, unknown>
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(childState)) {
    if (isNestedMarker(v)) {
      if (v.kind === 'array') safe[k] = []
      else if (v.kind === 'map') safe[k] = {}
      else safe[k] = resolveNestedSingleDefaults(v)
    } else {
      safe[k] = v
    }
  }
  return safe
}

// ── Store Instance Creation ─────────────────────────────────────────

function createStoreInstance<TDeps, TRawState, TComputed, TIntents extends Record<string, unknown> = Record<string, never>>(
  config: StoreConfig<TDeps, TRawState, TComputed>,
  rawStateTemplate: Record<string, unknown>,
  nestedFields: Record<string, NestedMarker>,
  options?: StoreCreateOptions<TRawState, TDeps>,
): StoreInstance<TDeps, TRawState, TComputed, TIntents> {

  // ── State ──
  let rawState: Record<string, unknown> = { ...rawStateTemplate }
  if (options?.initialState) {
    rawState = deepMerge(rawState, options.initialState as Record<string, unknown>)
  }

  // ── Deps ──
  let deps = {} as TDeps
  if (options?.deps) {
    deps = { ...deps, ...options.deps } as TDeps
  }

  // ── Executor registry ──
  const executorMap = new Map<symbol, Executor['__fn']>()
  if (config.executors) {
    for (const executor of config.executors) {
      const command = getExecutorCommand(executor)
      const commandId = getCommandId(command)
      executorMap.set(commandId, getExecutorFn(executor))
    }
  }

  // ── Computed ──
  // When nested fields exist, inject safe defaults so computed functions can run
  // before nested stores are initialized. Computed is re-evaluated after nested
  // initialization at line ~1217.
  let stateForInitialComputed: Record<string, unknown> = rawState
  if (Object.keys(nestedFields).length > 0) {
    const nestedDefaults: Record<string, unknown> = {}
    for (const [key, marker] of Object.entries(nestedFields)) {
      if (marker.kind === 'array') nestedDefaults[key] = []
      else if (marker.kind === 'map') nestedDefaults[key] = {}
      else nestedDefaults[key] = resolveNestedSingleDefaults(marker)
    }
    stateForInitialComputed = { ...rawState, ...nestedDefaults }
  }
  const computedNodes: ComputedNode[] = initializeComputedNodes(
    stateForInitialComputed,
    config.computed,
  )
  let computedValues: Record<string, unknown> = {}
  for (const node of computedNodes) {
    computedValues[node.name] = node.value
  }

  // ── Snapshot cache ──
  // getCombinedState() must return the same reference when called multiple times
  // without state changes in between. This is required by React's useSyncExternalStore
  // which calls getSnapshot() twice and compares with Object.is().
  let cachedCombinedState: Record<string, unknown> | null = null

  function invalidateCache(): void {
    cachedCombinedState = null
  }

  // ── Listeners ──
  const stateListeners = new Set<(state: Record<string, unknown>) => void>()
  const eventListeners = new Set<(event: EventInstance) => void>()

  // ── Running executors ──
  const runningControllers = new Map<symbol, AbortController>()
  let runningCount = 0

  // ── Lifecycle ──
  let disposed = false

  // ── Relay tracking ──
  let relayDepth = 0
  const relayProcessing = new Set<string>()

  // ── Event log (for testing) ──
  const eventLog: EventInstance[] = []
  const stateSnapshots: Array<{ event: EventInstance; state: Record<string, unknown> }> = []

  // ── Nested store management ──
  const nestedManagers: NestedManager[] = []
  const scope: Record<string, unknown> = {}

  // ── Helpers ──

  function getNestedStates(): Record<string, unknown> {
    const nestedState: Record<string, unknown> = {}
    for (const mgr of nestedManagers) {
      if (mgr.kind === 'single') {
        nestedState[mgr.key] = mgr.instance ? mgr.instance.getState() : null
      } else if (mgr.kind === 'array') {
        const arr: unknown[] = []
        for (const [, entry] of mgr.instances) {
          arr.push(entry.instance.getState())
        }
        nestedState[mgr.key] = arr
      } else if (mgr.kind === 'map') {
        const rec: Record<string, unknown> = {}
        for (const [key, entry] of mgr.instances) {
          rec[key] = entry.instance.getState()
        }
        nestedState[mgr.key] = rec
      }
    }
    return nestedState
  }

  function getCombinedState(): Record<string, unknown> {
    if (cachedCombinedState !== null) return cachedCombinedState
    cachedCombinedState = { ...rawState, ...computedValues, ...getNestedStates() }
    return cachedCombinedState
  }

  function recomputeFromNestedChange(): void {
    // Nested state changed — always invalidate cache
    invalidateCache()
    if (computedNodes.length === 0) return
    const nestedKeys = new Set<string>(nestedManagers.map((m) => m.key))
    if (nestedKeys.size === 0) return
    const stateForComputed = { ...rawState, ...getNestedStates() }
    const { values, changed } = evaluateComputedNodes(computedNodes, stateForComputed, nestedKeys)
    if (changed) {
      computedValues = values
    }
  }

  function notifyStateListeners(): void {
    const state = getCombinedState()
    for (const listener of stateListeners) {
      listener(state)
    }
  }

  function notifyEventListeners(event: EventInstance): void {
    for (const listener of eventListeners) {
      listener(event)
    }
  }

  // ── Forward events to nested children ──

  const forwardingEvents = new Set<string>()
  let isForwardingToChildren = false

  function forwardEventToNestedChildren(event: EventInstance): void {
    if (nestedManagers.length === 0) return
    if (forwardingEvents.has(event.type)) return

    forwardingEvents.add(event.type)
    isForwardingToChildren = true
    try {
      for (const mgr of nestedManagers) {
        if (mgr.kind === 'single') {
          const singleMgr = mgr as NestedSingleManager
          if (singleMgr.instance) {
            const childInternal = singleMgr.instance as StoreInstance & StoreInternalFields
            childInternal.__applyEvent(event, { skipEventLog: true })
          }
        } else if (mgr.kind === 'array') {
          const arrayMgr = mgr as NestedArrayManager
          for (const [, entry] of arrayMgr.instances) {
            const childInternal = entry.instance as StoreInstance & StoreInternalFields
            childInternal.__applyEvent(event, { skipEventLog: true })
          }
        } else if (mgr.kind === 'map') {
          const mapMgr = mgr as NestedMapManager
          for (const [, entry] of mapMgr.instances) {
            const childInternal = entry.instance as StoreInstance & StoreInternalFields
            childInternal.__applyEvent(event, { skipEventLog: true })
          }
        }
      }
    } finally {
      isForwardingToChildren = false
      forwardingEvents.delete(event.type)
    }
  }

  // ── Middleware helpers ──

  function mwEvent(event: EventInstance, state: Record<string, unknown>): void {
    if (!config.middleware) return
    for (const mw of config.middleware) { mw.onEvent?.(event, state) }
  }

  function mwStateChange(prev: Record<string, unknown>, next: Record<string, unknown>): void {
    if (!config.middleware) return
    for (const mw of config.middleware) { mw.onStateChange?.(prev, next) }
  }

  function mwIntentStart(intent: IntentDescriptor, payload: unknown): void {
    if (!config.middleware) return
    for (const mw of config.middleware) { mw.onIntentStart?.(intent, payload) }
  }

  function mwIntentEnd(intent: IntentDescriptor, payload: unknown): void {
    if (!config.middleware) return
    for (const mw of config.middleware) { mw.onIntentEnd?.(intent, payload) }
  }

  function mwError(error: Error, context: { intent: IntentDescriptor; payload?: unknown; command?: Command }): void {
    if (!config.middleware) return
    for (const mw of config.middleware) { mw.onError?.(error, context) }
  }

  // ── Core: apply event ──

  function applyEvent(event: EventInstance, metaOrOptions?: NestedMeta | { skipEventLog?: boolean }): void {
    if (disposed) return
    const meta = metaOrOptions && 'source' in metaOrOptions ? metaOrOptions as NestedMeta : undefined
    const eventOptions = metaOrOptions && 'skipEventLog' in metaOrOptions ? metaOrOptions as { skipEventLog?: boolean } : undefined
    // Log event (unless forwarded from parent — parent already logged it)
    if (!eventOptions?.skipEventLog) {
      eventLog.push(event)
    }

    const handler = config.on?.[event.type]
    if (handler) {
      const prevState = getCombinedState()
      // Merge nested child states into input so on handlers can read nested collections
      const inputState = nestedManagers.length > 0
        ? { ...rawState, ...getNestedStates() }
        : { ...rawState }
      if (IS_DEV) Object.freeze(inputState)
      const { type: _type, ...payload } = event
      const newState = meta
        ? handler(inputState, payload as Record<string, unknown>, meta)
        : handler(inputState, payload as Record<string, unknown>)

      // Track changed keys
      const changedKeys = new Set<string>()
      for (const key of Object.keys(newState)) {
        if (rawState[key] !== newState[key]) {
          changedKeys.add(key)
        }
      }
      rawState = newState
      invalidateCache()

      // Sync nested array/map children BEFORE computing
      if (nestedManagers.length > 0 && changedKeys.size > 0) {
        syncNestedFromRawState(changedKeys)
      }

      // Re-evaluate computed
      if (config.computed && computedNodes.length > 0 && changedKeys.size > 0) {
        const stateForComputed = nestedManagers.length > 0
          ? { ...rawState, ...getNestedStates() }
          : rawState
        const { values } = evaluateComputedNodes(
          computedNodes,
          stateForComputed,
          changedKeys,
        )
        computedValues = values
        invalidateCache()
      }

      const nextState = getCombinedState()

      // Record snapshot for testing
      stateSnapshots.push({ event, state: nextState })

      mwEvent(event, nextState)
      mwStateChange(prevState, nextState)
      notifyEventListeners(event)
      notifyStateListeners()
    } else {
      // No handler but still record and notify
      stateSnapshots.push({ event, state: getCombinedState() })
      mwEvent(event, getCombinedState())
      notifyEventListeners(event)
    }

    processRelay(event)

    // Forward event down to nested children
    forwardEventToNestedChildren(event)
  }

  // ── Relay ──

  function processRelay(event: EventInstance): void {
    if (!config.relay || disposed) return

    const relayHandler = config.relay[event.type]
    if (!relayHandler) return

    if (relayProcessing.has(event.type)) return

    relayDepth++

    if (relayDepth > MAX_RELAY_DEPTH) {
      if (IS_DEV) {
        console.error(
          `[hurum] Relay depth limit exceeded (${MAX_RELAY_DEPTH}). Event: ${event.type}.`,
        )
      }
      relayDepth--
      return
    }

    if (IS_DEV && relayDepth > 3) {
      console.warn(`[hurum] Relay depth ${relayDepth} for event "${event.type}".`)
    }

    relayProcessing.add(event.type)
    try {
      const relayedEvents = relayHandler(event, rawState)
      for (const relayedEvent of relayedEvents) {
        applyEvent(relayedEvent)
      }
    } finally {
      relayProcessing.delete(event.type)
      relayDepth--
    }
  }

  // ── Emit (for executors) ──

  function emit(event: EventInstance): void {
    if (disposed) return
    applyEvent(event)
  }

  // ── Execute command ──

  // Index: command ID → nested child instance that can execute it.
  // Built after initNestedStores() for Nested(single) children.
  const nestedExecutorIndex = new Map<symbol, StoreInstance & StoreInternalFields>()

  function buildNestedExecutorIndex(): void {
    for (const mgr of nestedManagers) {
      if (mgr.kind === 'single' && mgr.instance) {
        const childDef = mgr.marker.store as StoreDefinition
        const childConfig = childDef.__config as StoreConfig
        const childInternal = mgr.instance as StoreInstance & StoreInternalFields
        // Index direct child executors
        if (childConfig.executors) {
          for (const executor of childConfig.executors) {
            const command = getExecutorCommand(executor)
            const cid = getCommandId(command)
            nestedExecutorIndex.set(cid, childInternal)
          }
        }
        // Recursively index grandchild+ executors from Nested(single) descendants
        const descendantCommands = childInternal.__getHandleableCommands()
        for (const [cid, descendantStore] of descendantCommands) {
          nestedExecutorIndex.set(cid, descendantStore)
        }
      }
    }
  }

  function executeCommand(command: Command, payload: unknown, signal: AbortSignal): Promise<void> {
    const commandId = getCommandId(command)
    const executorFn = executorMap.get(commandId)

    if (!executorFn) {
      // Delegate to nested child store if it owns the executor
      const childInstance = nestedExecutorIndex.get(commandId)
      if (childInstance) {
        return childInstance.__executeCommand(command, payload, signal)
      }
      return Promise.reject(new Error('[hurum] No executor registered for command'))
    }

    const context = {
      deps,
      emit,
      getState: () => getCombinedState(),
      signal,
      scope,
    }

    try {
      const result = (executorFn as (payload: unknown, ctx: typeof context) => void | Promise<void>)(payload, context)
      return result instanceof Promise ? result : Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // ── Send ──

  function baseSend(intentOrPrepared: IntentDescriptor | PreparedIntent, payload?: unknown): IntentRef {
    if (disposed) {
      throw new Error('[hurum] Cannot send intent to a disposed store')
    }

    let intent: IntentDescriptor
    let resolvedPayload: unknown

    if (isPreparedIntent(intentOrPrepared)) {
      intent = intentOrPrepared.intent
      resolvedPayload = intentOrPrepared.payload
    } else {
      intent = intentOrPrepared
      resolvedPayload = payload
    }

    const refSymbol = Symbol('hurum/intent-ref')
    const ref: IntentRef = { __intentRefBrand: refSymbol }

    const controller = new AbortController()
    runningControllers.set(refSymbol, controller)
    runningCount++

    mwIntentStart(intent, resolvedPayload)

    const execute = async () => {
      try {
        if (intent.mode === 'sequential') {
          for (const step of intent.steps) {
            if (controller.signal.aborted) break
            if (isEventCreator(step)) {
              emit((step as EventCreator)(resolvedPayload))
            } else {
              await executeCommand(step as Command, resolvedPayload, controller.signal)
            }
          }
        } else if (intent.mode === 'all') {
          const promises = intent.steps.map((step) => {
            const childCtrl = new AbortController()
            controller.signal.addEventListener('abort', () => childCtrl.abort(), { once: true })
            if (isEventCreator(step)) {
              if (childCtrl.signal.aborted) return Promise.resolve()
              try { emit((step as EventCreator)(resolvedPayload)); return Promise.resolve() }
              catch (e) { return Promise.reject(e) }
            }
            return executeCommand(step as Command, resolvedPayload, childCtrl.signal)
          })
          try {
            await Promise.all(promises)
          } catch (error) {
            controller.abort()
            throw error
          }
        } else if (intent.mode === 'allSettled') {
          const promises = intent.steps.map((step) => {
            const childCtrl = new AbortController()
            controller.signal.addEventListener('abort', () => childCtrl.abort(), { once: true })
            if (isEventCreator(step)) {
              if (childCtrl.signal.aborted) return Promise.resolve()
              try { emit((step as EventCreator)(resolvedPayload)); return Promise.resolve() }
              catch (e) {
                mwError(e instanceof Error ? e : new Error(String(e)), { intent, payload: resolvedPayload })
                return Promise.resolve()
              }
            }
            return executeCommand(step as Command, resolvedPayload, childCtrl.signal).catch((err) => {
              mwError(err instanceof Error ? err : new Error(String(err)), { intent, command: step as Command, payload: resolvedPayload })
            })
          })
          await Promise.allSettled(promises)
        }
      } catch (error) {
        mwError(error instanceof Error ? error : new Error(String(error)), { intent, payload: resolvedPayload })
      } finally {
        runningControllers.delete(refSymbol)
        runningCount--
        mwIntentEnd(intent, resolvedPayload)
      }
    }

    execute()
    return ref
  }

  // ── Cancel ──

  function cancel(ref: IntentRef): void {
    const refSymbol = ref.__intentRefBrand
    const controller = runningControllers.get(refSymbol)
    if (controller) {
      controller.abort()
      runningControllers.delete(refSymbol)
      runningCount--
    }
  }

  function cancelAll(): void {
    for (const [_sym, controller] of runningControllers) {
      controller.abort()
    }
    runningControllers.clear()
    runningCount = 0
  }

  // ── Root Delegation ──
  // For Nested(single) children: send goes through root store's baseSend → root middleware always runs.
  // Top-level store: rootBaseSend = own baseSend.
  // Nested child: rootBaseSend = inherited from parent (ultimately the root ancestor).
  const __parentRootSend = (options as Record<string, unknown> | undefined)?.['__rootBaseSend'] as typeof baseSend | undefined
  const __parentRootCancel = (options as Record<string, unknown> | undefined)?.['__rootCancel'] as typeof cancel | undefined
  const __parentRootCancelAll = (options as Record<string, unknown> | undefined)?.['__rootCancelAll'] as typeof cancelAll | undefined
  const rootBaseSend = __parentRootSend ?? baseSend
  const rootCancel = __parentRootCancel ?? cancel
  const rootCancelAll = __parentRootCancelAll ?? cancelAll

  // ── Subscribe ──

  function subscribe(
    cbOrType: ((state: Record<string, unknown>) => void) | 'events',
    cb?: (event: EventInstance) => void,
  ): () => void {
    if (cbOrType === 'events' && cb) {
      eventListeners.add(cb)
      return () => { eventListeners.delete(cb) }
    }
    if (typeof cbOrType === 'function') {
      stateListeners.add(cbOrType)
      return () => { stateListeners.delete(cbOrType) }
    }
    throw new Error('[hurum] Invalid subscribe arguments')
  }

  // ── Dispose ──

  function dispose(): void {
    if (disposed) return
    disposed = true
    cancelAll()

    // Dispose all nested child stores
    for (const mgr of nestedManagers) {
      if (mgr.kind === 'single') {
        if (mgr.unsub) mgr.unsub()
        if (mgr.instance) mgr.instance.dispose()
      } else {
        for (const [, entry] of mgr.instances) {
          entry.unsub()
          entry.instance.dispose()
        }
        mgr.instances.clear()
      }
    }

    stateListeners.clear()
    eventListeners.clear()
  }

  // ── Nested Store Initialization ──

  /** Subscribe to a nested child store and wire up event/state bubbling + middleware. */
  function subscribeToNestedChild(childInstance: StoreInstance, logToEventLog: boolean): () => void {
    const unsub = childInstance.subscribe(() => {
      if (!disposed) {
        const prev = getCombinedState()
        recomputeFromNestedChange()
        const next = getCombinedState()
        mwStateChange(prev, next)
        notifyStateListeners()
      }
    })
    const unsubEvents = childInstance.subscribe('events', (event: EventInstance) => {
      if (!disposed && !isForwardingToChildren) {
        if (logToEventLog) eventLog.push(event)
        mwEvent(event, getCombinedState())
        notifyEventListeners(event)
        processRelay(event)
      }
    })
    return () => { unsub(); unsubEvents() }
  }

  function initNestedStores(): void {
    for (const [key, marker] of Object.entries(nestedFields)) {
      const storeDef = marker.store as StoreDefinition
      const childDepsFactory = config.childDepsMap?.[key]

      if (marker.kind === 'single') {
        const mgr: NestedSingleManager = {
          kind: 'single',
          key,
          marker,
          instance: null,
          unsub: null,
        }

        // Create child instance — pass root delegation context for recursive propagation
        const childDeps = childDepsFactory ? childDepsFactory(deps as Record<string, unknown>) : undefined
        const childCreateOpts: Record<string, unknown> = { deps: childDeps }
        childCreateOpts['__rootBaseSend'] = rootBaseSend
        childCreateOpts['__rootCancel'] = rootCancel
        childCreateOpts['__rootCancelAll'] = rootCancelAll
        const childInstance = storeDef.create(childCreateOpts as StoreCreateOptions<unknown, unknown>)

        // Replace child's send/cancel/cancelAll with root delegation
        const childConfig = (storeDef as StoreDefinition).__config as StoreConfig
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(childInstance as any).send = createSendProxy(rootBaseSend, childConfig.intents)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(childInstance as any).cancel = rootCancel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(childInstance as any).cancelAll = rootCancelAll

        // Subscribe to child state/event changes — bubble up + notify middleware
        const unsubChild = subscribeToNestedChild(childInstance, false)

        mgr.instance = childInstance
        mgr.unsub = unsubChild
        nestedManagers.push(mgr)
        scope[key] = childInstance

      } else if (marker.kind === 'array') {
        const mgr: NestedArrayManager = {
          kind: 'array',
          key,
          marker,
          instances: new Map(),
        }
        nestedManagers.push(mgr)

        // Initialize from initialState if provided
        const initialArray = (options?.initialState as Record<string, unknown> | undefined)?.[key]
        if (Array.isArray(initialArray)) {
          for (let i = 0; i < initialArray.length; i++) {
            const item = initialArray[i] as Record<string, unknown> | undefined
            const id = item?.id
            if (id == null) {
              if (IS_DEV) {
                console.warn(`[hurum] Nested.array item at index ${i} in "${key}" has no 'id' field. Skipping.`)
              }
              continue
            }
            const instanceId = nextInstanceId()
            const childDeps = childDepsFactory ? childDepsFactory(deps as Record<string, unknown>) : undefined
            const childInstance = storeDef.create({
              initialState: item,
              deps: childDeps,
            })

            const meta: NestedMeta = {
              source: { instanceId, index: i, parentKey: key },
            }

            const unsubChild = subscribeToNestedChild(childInstance, true)

            mgr.instances.set(String(id), {
              instance: childInstance,
              unsub: unsubChild,
            })

            // Store meta on instance for retrieval
            ;(childInstance as StoreInstance & { __nestedMeta?: NestedMeta }).__nestedMeta = meta
          }
        }

        // Expose scope as NestedArrayScope with ID-based O(1) access
        const arrayScope: NestedArrayScope = {
          get(id: string) {
            return mgr.instances.get(id)?.instance
          },
          values() {
            const arr: StoreInstance[] = []
            for (const [, entry] of mgr.instances) {
              arr.push(entry.instance)
            }
            return arr
          },
          get size() {
            return mgr.instances.size
          },
          [Symbol.iterator]() {
            const entries = mgr.instances.values()
            return {
              next(): IteratorResult<StoreInstance> {
                const result = entries.next()
                if (result.done) return { done: true, value: undefined }
                return { done: false, value: result.value.instance }
              },
            }
          },
        }
        scope[key] = arrayScope

      } else if (marker.kind === 'map') {
        const mgr: NestedMapManager = {
          kind: 'map',
          key,
          marker,
          instances: new Map(),
        }
        nestedManagers.push(mgr)

        // Initialize from initialState if provided
        const initialMap = (options?.initialState as Record<string, unknown> | undefined)?.[key]
        if (initialMap && typeof initialMap === 'object' && !Array.isArray(initialMap)) {
          for (const [mapKey, mapValue] of Object.entries(initialMap as Record<string, unknown>)) {
            const childDeps = childDepsFactory ? childDepsFactory(deps as Record<string, unknown>) : undefined
            const childInstance = storeDef.create({
              initialState: mapValue as Record<string, unknown>,
              deps: childDeps,
            })

            const unsubChild = subscribeToNestedChild(childInstance, true)

            mgr.instances.set(mapKey, {
              instance: childInstance,
              unsub: unsubChild,
            })
          }
        }

        // Expose scope as getter that returns a Map
        Object.defineProperty(scope, key, {
          get: () => {
            const map = new Map<string, StoreInstance>()
            for (const [k, entry] of mgr.instances) {
              map.set(k, entry.instance)
            }
            return map
          },
          enumerable: true,
          configurable: true,
        })
      }
    }
  }

  // ── Nested Sync: Reconcile child stores from parent state ──

  function syncNestedArray(mgr: NestedArrayManager, nextArray: unknown[]): void {
    if (!Array.isArray(nextArray)) return

    const storeDef = mgr.marker.store as StoreDefinition
    const childDepsFactory = config.childDepsMap?.[mgr.key]
    const existingIds = new Set(mgr.instances.keys())
    const nextIds = new Set<string>()

    for (let i = 0; i < nextArray.length; i++) {
      const item = nextArray[i] as Record<string, unknown> | undefined
      const id = item?.id
      if (id == null) continue
      const idStr = String(id)
      nextIds.add(idStr)

      if (!existingIds.has(idStr)) {
        // New child — create instance
        const instanceId = nextInstanceId()
        const childDeps = childDepsFactory ? childDepsFactory(deps as Record<string, unknown>) : undefined
        const childInstance = storeDef.create({
          initialState: item,
          deps: childDeps,
        })

        const meta: NestedMeta = {
          source: { instanceId, index: i, parentKey: mgr.key },
        }
        ;(childInstance as StoreInstance & { __nestedMeta?: NestedMeta }).__nestedMeta = meta

        const unsubChild = subscribeToNestedChild(childInstance, true)

        mgr.instances.set(idStr, {
          instance: childInstance,
          unsub: unsubChild,
        })
      }
    }

    // Remove children no longer in the array
    for (const id of existingIds) {
      if (!nextIds.has(id)) {
        const entry = mgr.instances.get(id)!
        entry.unsub()
        entry.instance.dispose()
        mgr.instances.delete(id)
      }
    }
  }

  function syncNestedMap(mgr: NestedMapManager, nextMap: Record<string, unknown>): void {
    if (!nextMap || typeof nextMap !== 'object' || Array.isArray(nextMap)) return

    const storeDef = mgr.marker.store as StoreDefinition
    const childDepsFactory = config.childDepsMap?.[mgr.key]
    const existingKeys = new Set(mgr.instances.keys())
    const nextKeys = new Set(Object.keys(nextMap))

    for (const key of nextKeys) {
      if (!existingKeys.has(key)) {
        // New child — create instance
        const childDeps = childDepsFactory ? childDepsFactory(deps as Record<string, unknown>) : undefined
        const childInstance = storeDef.create({
          initialState: nextMap[key] as Record<string, unknown>,
          deps: childDeps,
        })

        const unsubChild = subscribeToNestedChild(childInstance, true)

        mgr.instances.set(key, {
          instance: childInstance,
          unsub: unsubChild,
        })
      }
    }

    // Remove children no longer in the map
    for (const key of existingKeys) {
      if (!nextKeys.has(key)) {
        const entry = mgr.instances.get(key)!
        entry.unsub()
        entry.instance.dispose()
        mgr.instances.delete(key)
      }
    }
  }

  // ── Sync nested array/map from rawState ──
  let syncingNested = false

  function syncNestedFromRawState(changedKeys?: Set<string>): void {
    if (syncingNested) return
    syncingNested = true
    try {
      for (const mgr of nestedManagers) {
        if (mgr.kind !== 'array' && mgr.kind !== 'map') continue
        if (changedKeys && !changedKeys.has(mgr.key)) continue
        const currentRawValue = rawState[mgr.key]
        if (currentRawValue !== undefined) {
          if (mgr.kind === 'array') {
            syncNestedArray(mgr as NestedArrayManager, currentRawValue as unknown[])
          } else if (mgr.kind === 'map') {
            syncNestedMap(mgr as NestedMapManager, currentRawValue as Record<string, unknown>)
          }
        }
      }
    } finally {
      syncingNested = false
    }
  }

  function setupNestedSync(): void {
    // No-op: sync is now handled inline in applyEvent().
  }

  // Initialize nested stores
  initNestedStores()
  setupNestedSync()
  buildNestedExecutorIndex()

  // Re-initialize computed nodes now that nested stores exist,
  // so dependency tracking captures access to nested child state fields.
  if (nestedManagers.length > 0 && config.computed && computedNodes.length > 0) {
    const combinedForInit = { ...rawState, ...getNestedStates() }
    const freshNodes = initializeComputedNodes(
      combinedForInit,
      config.computed,
    )
    computedNodes.length = 0
    computedNodes.push(...freshNodes)
    computedValues = {}
    for (const node of computedNodes) {
      computedValues[node.name] = node.value
    }
  }

  // ── Send Proxy ──

  const sendProxy = createSendProxy(baseSend, config.intents)

  // ── Instance ──

  const instance: StoreInstance<TDeps, TRawState, TComputed, TIntents> & StoreInternalFields = {
    send: sendProxy as SendFn<TIntents>,
    cancel,
    cancelAll,
    getState: getCombinedState as StoreInstance<TDeps, TRawState, TComputed, Record<string, never>>['getState'],
    subscribe: subscribe as StoreInstance<TDeps, TRawState, TComputed, Record<string, never>>['subscribe'],
    dispose,
    selector<T>(fn: (state: ResolvedState<TRawState> & TComputed) => T): Selector<T> {
      return createSelector(
        getCombinedState as () => ResolvedState<TRawState> & TComputed,
        subscribe as (cb: (state: ResolvedState<TRawState> & TComputed) => void) => () => void,
        fn,
      )
    },
    scope: scope as ScopeOf<TRawState>,
    // Internal — used by testing API and event forwarding
    __eventLog: eventLog,
    __stateSnapshots: stateSnapshots,
    __runningCount: () => runningCount,
    __rawState: () => rawState,
    __applyEvent: (event: EventInstance, opts?: { skipEventLog?: boolean }) => applyEvent(event, opts),
    __executeCommand: executeCommand,
    __getHandleableCommands: () => nestedExecutorIndex,
  }

  // Brand for runtime type guard (isStoreInstance)
  Object.defineProperty(instance, STORE_INSTANCE_BRAND, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  })

  // Notify middleware that the store is ready
  if (config.middleware) {
    const storeRef = {
      getState: () => getCombinedState() as Record<string, unknown>,
      meta: {
        computedKeys: computedNodes.map((n) => n.name),
        nestedKeys: nestedManagers.map((m) => ({ key: m.key, kind: m.kind })),
      },
    }
    for (const mw of config.middleware) { mw.onAttach?.(storeRef) }
  }

  return instance
}
