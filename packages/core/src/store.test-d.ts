import { describe, it, expectTypeOf } from 'vitest'
import { Events, Event } from './events'
import { CommandExecutor } from './command-executor'
import { Intents, Intent } from './intent'
import { Store } from './store'
import type { IntentMap, IntentRef } from './store'
import { Nested } from './nested'

// ── Setup: Counter domain ─────────────────────────────────────────

const CounterEvent = Events('Counter', {
  incremented: Event<{ amount: number }>(),
  decremented: Event<{ amount: number }>(),
  reset: Event<{}>(),
})

const [IncrementCommand, IncrementExecutor] = CommandExecutor<{ amount: number }>((cmd, { emit }) => {
  emit(CounterEvent.incremented(cmd))
})
const [DecrementCommand, DecrementExecutor] = CommandExecutor<{ amount: number }>((cmd, { emit }) => {
  emit(CounterEvent.decremented(cmd))
})
const [ResetCommand, ResetExecutor] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(CounterEvent.reset(cmd))
})

const CounterIntents = Intents('Counter', {
  plusClicked: Intent(IncrementCommand),
  minusClicked: Intent(DecrementCommand),
  resetClicked: Intent(ResetCommand),
})

function createCounterStore() {
  return Store({ state: { count: 0, multiplier: 2 } })
    .on(CounterEvent, {
      incremented: (state, { amount }) => ({
        ...state,
        count: state.count + amount,
      }),
      decremented: (state, { amount }) => ({
        ...state,
        count: state.count - amount,
      }),
      reset: (state) => ({
        ...state,
        count: 0,
      }),
    })
    .computed({
      doubled: (state) => state.count * 2,
      product: (state) => state.count * state.multiplier,
    })
    .intents(CounterIntents)
    .executors(IncrementExecutor, DecrementExecutor, ResetExecutor)
}

// ── .on() type inference ──────────────────────────────────────────

describe('.on() type inference', () => {
  it('per-event handler infers state and payload', () => {
    const TestEvent = Events('InferTest', {
      happened: Event<{ value: number }>(),
    })

    void Store({ state: { count: 0, label: 'hello' } })
      .on(TestEvent.happened, (state, payload) => {
        expectTypeOf(state).toEqualTypeOf<{ count: number; label: string }>()
        expectTypeOf(payload).toEqualTypeOf<{ value: number }>()
        return { ...state, count: payload.value }
      })
  })

  it('namespace handler infers per-event payloads', () => {
    const NsEvent = Events('Ns', {
      alpha: Event<{ x: number }>(),
      beta: Event<{ y: string }>(),
    })

    void Store({ state: { x: 0, y: '' } })
      .on(NsEvent, {
        alpha: (state, payload) => {
          expectTypeOf(payload).toEqualTypeOf<{ x: number }>()
          return { ...state, x: payload.x }
        },
        beta: (state, payload) => {
          expectTypeOf(payload).toEqualTypeOf<{ y: string }>()
          return { ...state, y: payload.y }
        },
      })
  })
})

// ── getState() type inference ─────────────────────────────────────

describe('getState() type inference', () => {
  it('includes raw state + computed', () => {
    const store = createCounterStore().create()
    type State = ReturnType<typeof store.getState>

    expectTypeOf<State['count']>().toEqualTypeOf<number>()
    expectTypeOf<State['multiplier']>().toEqualTypeOf<number>()
    expectTypeOf<State['doubled']>().toEqualTypeOf<number>()
    expectTypeOf<State['product']>().toEqualTypeOf<number>()
  })

  it('includes resolved nested and computed', () => {
    const InnerStore = Store({ state: { x: 0 } })
      .computed({ xSquared: (s) => s.x * s.x })

    const OuterDef = Store({ state: { inner: Nested(InnerStore), count: 5 } })
      .computed({ doubled: (s) => s.count * 2 })

    const store = OuterDef.create()
    type State = ReturnType<typeof store.getState>

    expectTypeOf<State['count']>().toEqualTypeOf<number>()
    expectTypeOf<State['doubled']>().toEqualTypeOf<number>()
    expectTypeOf<State['inner']['x']>().toEqualTypeOf<number>()
    expectTypeOf<State['inner']['xSquared']>().toEqualTypeOf<number>()
  })
})

// ── IntentMap ─────────────────────────────────────────────────────

describe('IntentMap', () => {
  it('extracts intent names and payload types', () => {
    type Map = IntentMap<typeof CounterIntents>

    expectTypeOf<Map['plusClicked']>().toEqualTypeOf<{ amount: number }>()
    expectTypeOf<Map['minusClicked']>().toEqualTypeOf<{ amount: number }>()
    expectTypeOf<Map['resetClicked']>().toEqualTypeOf<{}>()
  })
})

// ── SendFn ────────────────────────────────────────────────────────

describe('SendFn type', () => {
  it('send accepts PreparedIntent', () => {
    const store = createCounterStore().create()
    const prepared = CounterIntents.plusClicked({ amount: 1 })
    expectTypeOf(store.send).toBeCallableWith(prepared)
  })

  it('send accepts (IntentDescriptor, payload)', () => {
    const store = createCounterStore().create()
    expectTypeOf(store.send).toBeCallableWith(CounterIntents.plusClicked, { amount: 1 })
  })

  it('send.intentName() has correct payload type', () => {
    const store = createCounterStore().create()
    expectTypeOf(store.send.plusClicked).toBeFunction()
    expectTypeOf(store.send.plusClicked).parameter(0).toEqualTypeOf<{ amount: number }>()
  })

  it('send.intentName() returns IntentRef', () => {
    const store = createCounterStore().create()
    expectTypeOf(store.send.plusClicked({ amount: 1 })).toEqualTypeOf<IntentRef>()
  })

  it('rejects wrong payload type', () => {
    const store = createCounterStore().create()

    // @ts-expect-error — wrong payload type
    store.send(CounterIntents.plusClicked, { amount: 'not-a-number' })

    // @ts-expect-error — missing required field
    store.send(CounterIntents.plusClicked, {})
  })

  it('store without intents has no send shortcuts', () => {
    const BareStore = Store({ state: { x: 0 } })
    const bare = BareStore.create()
    expectTypeOf(bare.send).toBeFunction()
    // No named intent methods exist — only callable overloads
  })
})

// ── StoreInstance generic params ──────────────────────────────────

describe('StoreInstance generic', () => {
  it('captures deps, state, computed', () => {
    const TypedStore = Store({ state: { a: 1, b: 'hello' } })
      .deps<{ api: { fetch: () => Promise<string> } }>()
      .computed({ sum: (s) => s.a + s.b.length })

    type Instance = ReturnType<typeof TypedStore.create>
    type State = ReturnType<Instance['getState']>

    expectTypeOf<State['a']>().toEqualTypeOf<number>()
    expectTypeOf<State['b']>().toEqualTypeOf<string>()
    expectTypeOf<State['sum']>().toEqualTypeOf<number>()
  })
})
