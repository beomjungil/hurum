// @hurum/core/testing — TestIntent

import type { IntentDescriptor, IntentMode, IntentStep } from '../src/intent'

export interface TestIntentInstance {
  readonly steps: ReadonlyArray<IntentStep>
  readonly mode: IntentMode
}

/**
 * Create a test intent for inspecting intent configuration.
 * Returns the steps and execution mode of an intent descriptor.
 */
export function TestIntent(intent: IntentDescriptor): TestIntentInstance {
  return {
    steps: intent.steps,
    mode: intent.mode,
  }
}
