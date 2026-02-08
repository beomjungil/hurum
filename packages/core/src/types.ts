// @hurum/core — Utility types

import type { StoreDefinition, StoreInstance, ResolvedState } from './store'

/** Extract the store instance type from a store definition */
export type StoreOf<T> = T extends StoreDefinition<infer D, infer R, infer C, infer I>
  ? StoreInstance<D, R, C, I>
  : never

/** Extract the combined state type (resolved raw + computed) from a store definition */
export type StateOf<T> = T extends StoreDefinition<unknown, infer R, infer C>
  ? ResolvedState<R> & C
  : never

/** Extract the raw state type (without computed) from a store definition */
export type RawStateOf<T> = T extends StoreDefinition<unknown, infer R, unknown>
  ? R
  : never

/** Extract the deps type from a store definition */
export type DepsOf<T> = T extends StoreDefinition<infer D, unknown, unknown>
  ? D
  : never

/**
 * Detect conflicting keys between two deps types.
 * If the same key exists in both A and B with different types,
 * the intersection A & B makes that key's type `TypeA & TypeB`
 * which may be unassignable.
 */
export type DetectConflicts<A, B> = {
  [K in keyof A & keyof B]: A[K] extends B[K]
    ? B[K] extends A[K]
      ? never // Same type, no conflict
      : K     // Different types, conflict
    : K       // Different types, conflict
}[keyof A & keyof B]
