import { describe, it, expect } from 'vitest'
import { Events, Event } from '../events'
import { CommandExecutor } from '../command-executor'
import { Intents, Intent } from '../intent'
import { Store } from '../store'
import { undoRedo } from './undo-redo'

// ── Setup ────────────────────────────────────────────────────────────

const TestEvent = Events('UR', {
  set: Event<{ value: number }>(),
})

const [SetCmd, SetExec] = CommandExecutor<{ value: number }>((cmd, { emit }) => {
  emit(TestEvent.set(cmd))
})

const TestIntents = Intents('UR', {
  setValue: Intent(SetCmd),
})

function createStore(handle: ReturnType<typeof undoRedo>) {
  return Store({ state: { value: 0 } })
    .on(TestEvent, {
      set: (state, { value }) => ({ ...state, value }),
    })
    .intents(TestIntents)
    .executors(SetExec)
    .middleware(handle.middleware)
    .create()
}

// ── Tests ────────────────────────────────────────────────────────────

describe('undoRedo middleware', () => {
  it('tracks state history on state changes', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 2 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 3 })
    await new Promise((r) => setTimeout(r, 0))

    expect(handle.getHistory().length).toBe(3)
    expect(handle.getPosition()).toBe(2)
  })

  it('undo returns previous state', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 10 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 20 })
    await new Promise((r) => setTimeout(r, 0))

    const undoneState = handle.undo()
    expect(undoneState).not.toBeNull()
    expect(undoneState!.value).toBe(10)
    expect(handle.getPosition()).toBe(0)
  })

  it('redo returns next state', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 10 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 20 })
    await new Promise((r) => setTimeout(r, 0))

    handle.undo()
    const redoneState = handle.redo()
    expect(redoneState).not.toBeNull()
    expect(redoneState!.value).toBe(20)
    expect(handle.getPosition()).toBe(1)
  })

  it('undo at beginning returns null', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    // Position is 0, cannot undo further
    const result = handle.undo()
    expect(result).toBeNull()
  })

  it('redo at end returns null', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    const result = handle.redo()
    expect(result).toBeNull()
  })

  it('canUndo and canRedo report correctly', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    expect(handle.canUndo()).toBe(false)
    expect(handle.canRedo()).toBe(false)

    store.send(TestIntents.setValue, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 2 })
    await new Promise((r) => setTimeout(r, 0))

    expect(handle.canUndo()).toBe(true)
    expect(handle.canRedo()).toBe(false)

    handle.undo()
    expect(handle.canUndo()).toBe(false)
    expect(handle.canRedo()).toBe(true)
  })

  it('new state change after undo discards redo history', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 2 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 3 })
    await new Promise((r) => setTimeout(r, 0))

    // Undo twice (back to value=1)
    handle.undo()
    handle.undo()

    // Make a new change — should discard value=2 and value=3
    store.send(TestIntents.setValue, { value: 99 })
    await new Promise((r) => setTimeout(r, 0))

    expect(handle.canRedo()).toBe(false)
    expect(handle.getHistory().length).toBe(2)
    expect(handle.getHistory()[1]!.value).toBe(99)
  })

  it('maxHistory limits history size', async () => {
    const handle = undoRedo({ maxHistory: 3 })
    const store = createStore(handle)

    for (let i = 1; i <= 5; i++) {
      store.send(TestIntents.setValue, { value: i })
      await new Promise((r) => setTimeout(r, 0))
    }

    expect(handle.getHistory().length).toBe(3)
    // Only the last 3 states: value=3, 4, 5
    expect(handle.getHistory()[0]!.value).toBe(3)
    expect(handle.getHistory()[2]!.value).toBe(5)
  })

  it('returns deep clones from undo/redo', async () => {
    const handle = undoRedo()
    const store = createStore(handle)

    store.send(TestIntents.setValue, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 2 })
    await new Promise((r) => setTimeout(r, 0))

    store.send(TestIntents.setValue, { value: 3 })
    await new Promise((r) => setTimeout(r, 0))

    // Undo to value=2
    const state1 = handle.undo()
    expect(state1!.value).toBe(2)

    // Mutate the returned object
    ;(state1 as Record<string, unknown>).value = 999

    // Redo should return the original value=3, not affected by mutation
    const fresh = handle.redo()
    expect(fresh!.value).toBe(3)

    // And undoing again should give original value=2, not 999
    const again = handle.undo()
    expect(again!.value).toBe(2)
  })
})
