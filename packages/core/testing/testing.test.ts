import { describe, it, expect, vi } from 'vitest'
import { Events, Event, CommandExecutor, Intents, Intent, Store } from '../src/index'
import { TestStore } from './test-store'
import { TestExecutor } from './test-executor'
import { TestReducer } from './test-reducer'
import { TestComputed } from './test-computed'
import { TestIntent } from './test-intent'

// ── Domain setup ────────────────────────────────────────────────────

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

// ── Async domain ────────────────────────────────────────────────────

const SaveEvent = Events('Save', {
  saveRequested: Event<{ id: string }>(),
  saved: Event<{ data: string }>(),
  saveFailed: Event<{ error: string }>(),
})

const [SaveCommand, SaveExecutor] = CommandExecutor<
  { id: string },
  { repo: { save: (id: string) => Promise<string> } }
>(async (command, { deps, emit }) => {
  emit(SaveEvent.saveRequested({ id: command.id }))
  try {
    const data = await deps.repo.save(command.id)
    emit(SaveEvent.saved({ data }))
  } catch (e) {
    emit(SaveEvent.saveFailed({ error: String(e) }))
  }
})

const SaveIntents = Intents('Save', {
  saveClicked: Intent(SaveCommand),
})

const SaveStore = Store({
  state: {
    data: null as string | null,
    saving: false,
    error: null as string | null,
  },
})
  .deps<{ repo: { save: (id: string) => Promise<string> } }>()
  .on(SaveEvent, {
    saveRequested: (state) => ({
      ...state,
      saving: true,
      error: null,
    }),
    saved: (state, { data }) => ({
      ...state,
      data,
      saving: false,
    }),
    saveFailed: (state, { error }) => ({
      ...state,
      saving: false,
      error,
    }),
  })
  .intents(SaveIntents)
  .executors(SaveExecutor)

// ── TestStore ───────────────────────────────────────────────────────

describe('TestStore', () => {
  it('send + assertState', async () => {
    const store = TestStore(CounterStore)

    await store.send(CounterIntents.plusClicked, { amount: 5 })

    store.assertState({ count: 5 })
  })

  it('assertEvents matches emitted events', async () => {
    const store = TestStore(CounterStore)

    await store.send(CounterIntents.plusClicked, { amount: 3 })

    store.assertEvents([
      CounterEvent.incremented({ amount: 3 }),
    ])
  })

  it('assertEvents throws on mismatch', async () => {
    const store = TestStore(CounterStore)

    await store.send(CounterIntents.plusClicked, { amount: 3 })

    expect(() => {
      store.assertEvents([
        CounterEvent.incremented({ amount: 99 }),
      ])
    }).toThrow('Event mismatch')
  })

  it('assertEventSequence checks events with state snapshots', async () => {
    const mockRepo = { save: vi.fn().mockResolvedValue('saved-data') }
    const store = TestStore(SaveStore, {
      deps: { repo: mockRepo },
    })

    await store.send(SaveIntents.saveClicked, { id: '123' })

    store.assertEventSequence([
      {
        event: SaveEvent.saveRequested({ id: '123' }),
        state: { saving: true, error: null } as Partial<ReturnType<typeof store.getState>>,
      },
      {
        event: SaveEvent.saved({ data: 'saved-data' }),
        state: { saving: false, data: 'saved-data' } as Partial<ReturnType<typeof store.getState>>,
      },
    ])
  })

  it('assertNoRunningExecutors passes when all done', async () => {
    const mockRepo = { save: vi.fn().mockResolvedValue('data') }
    const store = TestStore(SaveStore, { deps: { repo: mockRepo } })

    await store.send(SaveIntents.saveClicked, { id: '1' })

    // Should not throw
    store.assertNoRunningExecutors()
  })

  it('initialState override', async () => {
    const store = TestStore(CounterStore, {
      initialState: { count: 100 },
    })

    expect(store.getState().count).toBe(100)

    await store.send(CounterIntents.plusClicked, { amount: 5 })
    store.assertState({ count: 105 })
  })
})

// ── TestExecutor ────────────────────────────────────────────────────

describe('TestExecutor', () => {
  it('run executes and captures emitted events', async () => {
    const mockRepo = { save: vi.fn().mockResolvedValue('saved') }
    const executor = TestExecutor(SaveExecutor, {
      deps: { repo: mockRepo },
      state: { data: null },
    })

    await executor.run({ id: 'abc' })

    executor.assertEmitted([
      SaveEvent.saveRequested({ id: 'abc' }),
      SaveEvent.saved({ data: 'saved' }),
    ])
  })

  it('abort sets signal to aborted', () => {
    const executor = TestExecutor(SaveExecutor, {
      deps: { repo: { save: vi.fn() } },
    })

    executor.abort()
    // After abort, running should not cause errors but signal is aborted
  })

  it('assertEmitted throws on mismatch', async () => {
    const executor = TestExecutor(IncrementExecutor)

    await executor.run({ amount: 5 })

    expect(() => {
      executor.assertEmitted([
        CounterEvent.incremented({ amount: 99 }),
      ])
    }).toThrow('Emitted event mismatch')
  })
})

// ── TestReducer ─────────────────────────────────────────────────────

describe('TestReducer', () => {
  it('applies event to state via on handler', () => {
    const reducer = TestReducer(CounterStore)

    const initial = { count: 0, multiplier: 2 }
    const next = reducer.apply(initial, CounterEvent.incremented({ amount: 5 }))

    expect(next).toEqual({ count: 5, multiplier: 2 })
  })

  it('returns same state if no handler for event', () => {
    const reducer = TestReducer(CounterStore)

    const initial = { count: 10, multiplier: 2 }
    const UnknownEvent = Events('Unknown', { happened: Event<{}>() })
    const next = reducer.apply(initial, UnknownEvent.happened({}))

    expect(next).toBe(initial)
  })

  it('handles multiple event applications', () => {
    const reducer = TestReducer(CounterStore)

    let state = { count: 0, multiplier: 2 }
    state = reducer.apply(state, CounterEvent.incremented({ amount: 3 }))
    state = reducer.apply(state, CounterEvent.incremented({ amount: 7 }))
    state = reducer.apply(state, CounterEvent.decremented({ amount: 2 }))

    expect(state.count).toBe(8)
  })
})

// ── TestComputed ────────────────────────────────────────────────────

describe('TestComputed', () => {
  it('evaluates computed field from raw state', () => {
    const computed = TestComputed(CounterStore, 'doubled')

    expect(computed.evaluate({ count: 5, multiplier: 2 })).toBe(10)
    expect(computed.evaluate({ count: 0, multiplier: 2 })).toBe(0)
  })

  it('evaluates product computed', () => {
    const computed = TestComputed(CounterStore, 'product')

    expect(computed.evaluate({ count: 3, multiplier: 4 })).toBe(12)
    expect(computed.evaluate({ count: 0, multiplier: 10 })).toBe(0)
  })

  it('throws for non-existent computed field', () => {
    expect(() => {
      // @ts-expect-error Testing invalid field name
      TestComputed(CounterStore, 'nonExistent')
        .evaluate({ count: 0, multiplier: 0 })
    }).toThrow('Computed field "nonExistent" not found')
  })
})

// ── TestIntent ──────────────────────────────────────────────────────

describe('TestIntent', () => {
  it('returns commands and mode for sequential intent', () => {
    const intent = TestIntent(CounterIntents.plusClicked)

    expect(intent.steps).toEqual([IncrementCommand])
    expect(intent.mode).toBe('sequential')
  })

  it('returns commands and mode for parallel intent', () => {
    const ParallelIntents = Intents('P', {
      init: Intent.allSettled(IncrementCommand, DecrementCommand),
    })

    const intent = TestIntent(ParallelIntents.init)

    expect(intent.steps).toEqual([IncrementCommand, DecrementCommand])
    expect(intent.mode).toBe('allSettled')
  })

  it('returns commands and mode for fail-fast intent', () => {
    const FailFastIntents = Intents('FF', {
      run: Intent.all(IncrementCommand, DecrementCommand),
    })

    const intent = TestIntent(FailFastIntents.run)

    expect(intent.steps).toEqual([IncrementCommand, DecrementCommand])
    expect(intent.mode).toBe('all')
  })
})

// ── TestStore send API ────────────────────────────────────────────

describe('TestStore send API', () => {
  it('send(PreparedIntent) works', async () => {
    const store = TestStore(CounterStore)
    await store.send(CounterIntents.plusClicked({ amount: 5 }))
    store.assertState({ count: 5 })
  })

  it('send.intentName() shorthand works', async () => {
    const store = TestStore(CounterStore)
    await store.send.plusClicked({ amount: 3 })
    store.assertState({ count: 3 })
  })

  it('send.intentName() chains correctly', async () => {
    const store = TestStore(CounterStore)
    await store.send.plusClicked({ amount: 10 })
    await store.send.minusClicked({ amount: 4 })
    store.assertState({ count: 6 })
  })

  it('legacy send(intent, payload) still works', async () => {
    const store = TestStore(CounterStore)
    await store.send(CounterIntents.plusClicked, { amount: 2 })
    store.assertState({ count: 2 })
  })
})

