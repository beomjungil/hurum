import { describe, it, expect, vi } from 'vitest'
import { Store } from './store'
import { Events, Event } from './events'
import { CommandExecutor } from './command-executor'
import { Intents, Intent } from './intent'
import { isSelector } from './selector'

const CounterEvent = Events('Counter', {
  incremented: Event<{ amount: number }>(),
  nameChanged: Event<{ name: string }>(),
})

const [IncrCmd, IncrExec] = CommandExecutor<{ amount: number }>((cmd, { emit }) => {
  emit(CounterEvent.incremented(cmd))
})
const [NameCmd, NameExec] = CommandExecutor<{ name: string }>((cmd, { emit }) => {
  emit(CounterEvent.nameChanged(cmd))
})

const CounterIntents = Intents('Counter', {
  increment: Intent(IncrCmd),
  changeName: Intent(NameCmd),
})

const CounterStore = Store({
  state: { count: 0, name: 'default' },
})
  .on(CounterEvent, {
    incremented: (state, { amount }) => ({ ...state, count: state.count + amount }),
    nameChanged: (state, { name }) => ({ ...state, name }),
  })
  .computed({
    doubled: (state) => state.count * 2,
  })
  .intents(CounterIntents)
  .executors(IncrExec, NameExec)

describe('Selector', () => {
  it('get() returns derived value', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => s.count * 10)
    expect(sel.get()).toBe(0)

    store.send(CounterIntents.increment, { amount: 3 })
    expect(sel.get()).toBe(30)
    store.dispose()
  })

  it('get() returns same reference for structurally equal objects', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => ({ value: s.count }))
    const ref1 = sel.get()

    // Send event that changes name, not count → derived value is same
    store.send(CounterIntents.changeName, { name: 'updated' })
    const ref2 = sel.get()

    expect(ref1).toBe(ref2) // same reference
    expect(ref2).toEqual({ value: 0 })
    store.dispose()
  })

  it('get() returns same reference for structurally equal arrays', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => [s.count, s.count + 1])
    const ref1 = sel.get()

    store.send(CounterIntents.changeName, { name: 'x' })
    const ref2 = sel.get()

    expect(ref1).toBe(ref2) // same reference
    expect(ref2).toEqual([0, 1])
    store.dispose()
  })

  it('get() returns new reference when derived value changes', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => ({ value: s.count }))
    const ref1 = sel.get()

    store.send(CounterIntents.increment, { amount: 1 })
    const ref2 = sel.get()

    expect(ref1).not.toBe(ref2)
    expect(ref2).toEqual({ value: 1 })
    store.dispose()
  })

  it('subscribe fires only when derived value changes', async () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => s.count)
    const cb = vi.fn()
    sel.subscribe(cb)

    // Change count → fires
    store.send(CounterIntents.increment, { amount: 5 })
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(5)

    // Change name, not count → does NOT fire
    store.send(CounterIntents.changeName, { name: 'x' })
    expect(cb).toHaveBeenCalledTimes(1)

    // Change count again → fires
    store.send(CounterIntents.increment, { amount: 2 })
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenCalledWith(7)

    store.dispose()
  })

  it('subscribe returns unsubscribe function', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => s.count)
    const cb = vi.fn()
    const unsub = sel.subscribe(cb)

    store.send(CounterIntents.increment, { amount: 1 })
    expect(cb).toHaveBeenCalledTimes(1)

    unsub()
    store.send(CounterIntents.increment, { amount: 1 })
    expect(cb).toHaveBeenCalledTimes(1) // no additional call

    store.dispose()
  })

  it('multiple selectors on same store are independent', () => {
    const store = CounterStore.create()
    const selCount = store.selector((s) => s.count)
    const selName = store.selector((s) => s.name)
    const cbCount = vi.fn()
    const cbName = vi.fn()

    selCount.subscribe(cbCount)
    selName.subscribe(cbName)

    store.send(CounterIntents.increment, { amount: 1 })
    expect(cbCount).toHaveBeenCalledTimes(1)
    expect(cbName).toHaveBeenCalledTimes(0)

    store.send(CounterIntents.changeName, { name: 'new' })
    expect(cbCount).toHaveBeenCalledTimes(1)
    expect(cbName).toHaveBeenCalledTimes(1)

    store.dispose()
  })

  it('works with computed fields', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => s.doubled + 100)
    expect(sel.get()).toBe(100) // doubled = 0

    store.send(CounterIntents.increment, { amount: 5 })
    expect(sel.get()).toBe(110) // doubled = 10

    store.dispose()
  })

  it('isSelector identifies Selector objects', () => {
    const store = CounterStore.create()
    const sel = store.selector((s) => s.count)
    expect(isSelector(sel)).toBe(true)
    expect(isSelector({})).toBe(false)
    expect(isSelector(null)).toBe(false)
    expect(isSelector(() => {})).toBe(false)
    store.dispose()
  })
})
