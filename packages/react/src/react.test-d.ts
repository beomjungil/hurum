import { describe, it, expectTypeOf } from 'vitest'
import { Events, Event, CommandExecutor, Intents, Intent, Store } from '@hurum/core'
import type { IntentRef } from '@hurum/core'
import { useStore } from './use-store'

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

function makeCounterStore() {
  return Store({ state: { count: 0, name: 'test', multiplier: 2 } })
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
    })
    .intents(CounterIntents)
    .executors(IncrementExecutor, DecrementExecutor, ResetExecutor)
}

// ── useStore(def) send types ─────────────────────────────────────

describe('useStore(def) send types', () => {
  it('send.intentName() has correct payload type', () => {
    const CounterStore = makeCounterStore()
    const fn = () => useStore(CounterStore)
    type StoreReturn = ReturnType<typeof fn>
    type Send = StoreReturn['send']

    expectTypeOf<Send['plusClicked']>().toBeFunction()
    expectTypeOf<Send['plusClicked']>().parameter(0).toEqualTypeOf<{ amount: number }>()
  })

  it('use.* hooks return correct types', () => {
    const CounterStore = makeCounterStore()
    const fn = () => useStore(CounterStore)
    type StoreReturn = ReturnType<typeof fn>
    type Use = StoreReturn['use']

    expectTypeOf<ReturnType<Use['count']>>().toEqualTypeOf<number>()
    expectTypeOf<ReturnType<Use['doubled']>>().toEqualTypeOf<number>()
  })

  it('send.intentName() returns IntentRef', () => {
    const CounterStore = makeCounterStore()
    const fn = () => useStore(CounterStore)
    type StoreReturn = ReturnType<typeof fn>
    type Send = StoreReturn['send']

    expectTypeOf<ReturnType<Send['plusClicked']>>().toEqualTypeOf<IntentRef>()
  })

  it('rejects wrong payload type', () => {
    const CounterStore = makeCounterStore()
    const fn = () => useStore(CounterStore)
    type StoreReturn = ReturnType<typeof fn>
    type Send = StoreReturn['send']

    // @ts-expect-error — wrong type
    type _Bad = ReturnType<Send['plusClicked']> extends (payload: { amount: string }) => IntentRef ? true : false
  })
})

// ── useStore(instance) types ─────────────────────────────────────

describe('useStore(instance) types', () => {
  it('returns same UseStoreReturn as def overload', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()
    const fn = () => useStore(instance)
    type StoreReturn = ReturnType<typeof fn>
    type Send = StoreReturn['send']

    expectTypeOf<Send['plusClicked']>().toBeFunction()
    expectTypeOf<Send['plusClicked']>().parameter(0).toEqualTypeOf<{ amount: number }>()
  })

  it('use.* hooks return correct types', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()
    const fn = () => useStore(instance)
    type StoreReturn = ReturnType<typeof fn>
    type Use = StoreReturn['use']

    expectTypeOf<ReturnType<Use['count']>>().toEqualTypeOf<number>()
    expectTypeOf<ReturnType<Use['doubled']>>().toEqualTypeOf<number>()
  })
})
