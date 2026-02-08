import { describe, it, expectTypeOf } from 'vitest'
import { Events, Event, CommandExecutor, Intents, Intent, Store } from '../src/index'
import { TestStore } from './test-store'

// ── Setup ─────────────────────────────────────────────────────────

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

const CounterStore = Store({ state: { count: 0, multiplier: 2 } })
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

// ── TestStore send types ──────────────────────────────────────────

describe('TestStore send type inference', () => {
  it('send.intentName() has correct payload type', () => {
    const store = TestStore(CounterStore)
    expectTypeOf(store.send.plusClicked).toBeFunction()
    expectTypeOf(store.send.plusClicked).parameter(0).toEqualTypeOf<{ amount: number }>()
  })

  it('send.intentName() returns Promise<void>', () => {
    const store = TestStore(CounterStore)
    expectTypeOf(store.send.plusClicked({ amount: 1 })).toEqualTypeOf<Promise<void>>()
  })

  it('send(PreparedIntent) returns Promise<void>', () => {
    const store = TestStore(CounterStore)
    const prepared = CounterIntents.plusClicked({ amount: 1 })
    expectTypeOf(store.send(prepared)).toEqualTypeOf<Promise<void>>()
  })

  it('send(intent, payload) returns Promise<void>', () => {
    const store = TestStore(CounterStore)
    expectTypeOf(
      store.send(CounterIntents.plusClicked, { amount: 1 }),
    ).toEqualTypeOf<Promise<void>>()
  })
})
