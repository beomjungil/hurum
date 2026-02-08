import { describe, it, expectTypeOf } from 'vitest'
import { Intent, Intents, isPreparedIntent } from './intent'
import type { IntentAction, IntentDescriptor, PreparedIntent } from './intent'
import { CommandExecutor } from './command-executor'
import { Events, Event } from './events'

const TestEvent = Events('Test', {
  a: Event<{}>(),
  b: Event<{}>(),
})

const [CmdA] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(TestEvent.a(cmd))
})
const [CmdB] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(TestEvent.b(cmd))
})

describe('IntentAction type', () => {
  it('Intent() returns IntentAction', () => {
    const intent = Intent(CmdA)
    expectTypeOf(intent).toEqualTypeOf<IntentAction<{}>>()
  })

  it('IntentAction is callable with correct payload', () => {
    const intent = Intent(CmdA)
    expectTypeOf(intent).toBeCallableWith({})
  })

  it('IntentAction has descriptor properties', () => {
    const intent = Intent(CmdA)
    expectTypeOf(intent.mode).toEqualTypeOf<'sequential' | 'all' | 'allSettled'>()
  })

  it('IntentAction is assignable to IntentDescriptor', () => {
    Intent(CmdA) satisfies IntentDescriptor<{}>
  })

  it('Intent.all / Intent.allSettled also return IntentAction', () => {
    expectTypeOf(Intent.all(CmdA)).toEqualTypeOf<IntentAction<{}>>()
    expectTypeOf(Intent.allSettled(CmdA, CmdB)).toEqualTypeOf<IntentAction<{}>>()
  })
})

describe('PreparedIntent type', () => {
  it('calling IntentAction returns PreparedIntent', () => {
    const intent = Intent(CmdA)
    const prepared = intent({})
    expectTypeOf(prepared).toEqualTypeOf<PreparedIntent<{}>>()
  })

  it('PreparedIntent preserves payload type', () => {
    const TypedEvent = Events('Typed', { e: Event<{ id: number }>() })
    const [TypedCmd] = CommandExecutor<{ id: number }>((cmd, { emit }) => {
      emit(TypedEvent.e(cmd))
    })
    const intent = Intent(TypedCmd)
    const prepared = intent({ id: 42 })

    expectTypeOf(prepared.payload).toEqualTypeOf<{ id: number }>()
    expectTypeOf(prepared.intent).toEqualTypeOf<IntentDescriptor<{ id: number }>>()
  })

  it('rejects wrong payload type', () => {
    const TypedEvent = Events('Typed', { e: Event<{ id: number }>() })
    const [TypedCmd] = CommandExecutor<{ id: number }>((cmd, { emit }) => {
      emit(TypedEvent.e(cmd))
    })
    const intent = Intent(TypedCmd)

    // @ts-expect-error — wrong payload type
    intent({ id: 'not-a-number' })

    // @ts-expect-error — missing required field
    intent({})
  })
})

describe('isPreparedIntent type narrowing', () => {
  it('narrows unknown to PreparedIntent', () => {
    const maybe: unknown = {}
    if (isPreparedIntent(maybe)) {
      expectTypeOf(maybe).toEqualTypeOf<PreparedIntent<unknown>>()
    }
  })
})

describe('Intents container type', () => {
  it('members are IntentAction', () => {
    const intents = Intents('T', {
      first: Intent(CmdA),
      second: Intent(CmdB),
    })

    expectTypeOf(intents.first).toEqualTypeOf<IntentAction<{}>>()
    expectTypeOf(intents.second).toEqualTypeOf<IntentAction<{}>>()
  })
})
