// @hurum/core/testing — TestComputed

import type { StoreDefinition } from '../src/store'

export interface TestComputedInstance<TResult = unknown> {
  evaluate(rawState: Record<string, unknown>): TResult
}

/**
 * Create a test computed for unit testing computed fields.
 * Evaluates a single computed field against a given raw state.
 */
export function TestComputed<TDeps, TRawState, TComputed>(
  storeDef: StoreDefinition<TDeps, TRawState, TComputed>,
  fieldName: string & keyof TComputed,
): TestComputedInstance<TComputed[typeof fieldName]> {
  const config = storeDef.__config
  const computedDef = config.computed

  if (!computedDef) {
    throw new Error(
      `[hurum] Store has no computed definition. Cannot test computed field "${fieldName}".`,
    )
  }

  return {
    evaluate(rawState: Record<string, unknown>): TComputed[typeof fieldName] {
      const fn = computedDef[fieldName]
      if (!fn || typeof fn !== 'function') {
        throw new Error(
          `[hurum] Computed field "${fieldName}" not found in store.`,
        )
      }
      return fn(rawState) as TComputed[typeof fieldName]
    },
  }
}
