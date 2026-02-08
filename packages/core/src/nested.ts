// @hurum/core — Nested, Nested.array, Nested.map

const NESTED_BRAND = Symbol('hurum/nested')

export type NestedKind = 'single' | 'array' | 'map'

export interface NestedMarker<TStore = unknown, TKind extends NestedKind = NestedKind> {
  readonly [NESTED_BRAND]: true
  readonly kind: TKind
  readonly store: TStore
}

/**
 * Declare a single nested child store.
 *
 * @example
 * ```ts
 * Store({ state: { transaction: Nested(TransactionStore) } })
 * ```
 */
export function Nested<TStore>(store: TStore): NestedMarker<TStore, 'single'> {
  return {
    [NESTED_BRAND]: true,
    kind: 'single',
    store,
  }
}

/**
 * Declare an array of nested child stores.
 * Array items are identified by their `id` field for diffing.
 *
 * @example
 * ```ts
 * Store({ state: { items: Nested.array(ItemStore) } })
 * ```
 */
Nested.array = function array<TStore>(store: TStore): NestedMarker<TStore, 'array'> {
  return {
    [NESTED_BRAND]: true,
    kind: 'array',
    store,
  }
}

/**
 * Declare a keyed map of nested child stores.
 *
 * @example
 * ```ts
 * Store({ state: { currencies: Nested.map(CurrencyStore) } })
 * ```
 */
Nested.map = function map<TStore>(store: TStore): NestedMarker<TStore, 'map'> {
  return {
    [NESTED_BRAND]: true,
    kind: 'map',
    store,
  }
}

/** Check if a value is a NestedMarker */
export function isNestedMarker(value: unknown): value is NestedMarker {
  return typeof value === 'object' && value !== null && NESTED_BRAND in value
}
