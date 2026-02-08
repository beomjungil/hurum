import { describe, it, expect, vi } from 'vitest'
import { Events, Event } from './events'
import { CommandExecutor } from './command-executor'
import { Intents, Intent, isPreparedIntent } from './intent'
import { Store } from './store'
import type { Middleware } from './middleware'

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

// ── Setup: Async domain ──────────────────────────────────────────

const AsyncEvent = Events('Async', {
  loadRequested: Event<{ id: string }>(),
  loaded: Event<{ data: string }>(),
  loadFailed: Event<{ error: string }>(),
})

const [LoadCommand, LoadExecutor] = CommandExecutor<
  { id: string },
  { api: { fetch: (id: string) => Promise<string> } }
>(async (command, { deps, emit, signal }) => {
  emit(AsyncEvent.loadRequested({ id: command.id }))
  if (signal.aborted) return
  try {
    const data = await deps.api.fetch(command.id)
    if (signal.aborted) return // check again after async
    emit(AsyncEvent.loaded({ data }))
  } catch (e) {
    if (signal.aborted) return
    emit(AsyncEvent.loadFailed({ error: String(e) }))
  }
})

const AsyncIntents = Intents('Async', {
  load: Intent(LoadCommand),
})

function createAsyncStore(api: { fetch: (id: string) => Promise<string> }) {
  return Store({
    state: {
      data: null as string | null,
      loading: false,
      error: null as string | null,
    },
  })
    .deps<{ api: { fetch: (id: string) => Promise<string> } }>()
    .on(AsyncEvent, {
      loadRequested: (state) => ({
        ...state,
        loading: true,
        error: null,
      }),
      loaded: (state, { data }) => ({
        ...state,
        data,
        loading: false,
      }),
      loadFailed: (state, { error }) => ({
        ...state,
        loading: false,
        error,
      }),
    })
    .intents(AsyncIntents)
    .executors(LoadExecutor)
    .create({ deps: { api } })
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Store', () => {
  describe('basic data flow', () => {
    it('creates a store instance with initial state and computed', () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()

      const state = store.getState()
      expect(state.count).toBe(0)
      expect(state.multiplier).toBe(2)
      expect(state.doubled).toBe(0)
      expect(state.product).toBe(0)
    })

    it('send triggers Intent -> Command -> Executor -> emit -> on -> state', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()

      store.send(CounterIntents.plusClicked, { amount: 5 })
      // executor is sync, so state is updated immediately after microtask
      await new Promise((r) => setTimeout(r, 0))

      const state = store.getState()
      expect(state.count).toBe(5)
      expect(state.doubled).toBe(10)
      expect(state.product).toBe(10)
    })

    it('multiple sends accumulate state changes', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()

      store.send(CounterIntents.plusClicked, { amount: 3 })
      store.send(CounterIntents.plusClicked, { amount: 7 })
      await new Promise((r) => setTimeout(r, 0))

      const state = store.getState()
      expect(state.count).toBe(10)
      expect(state.doubled).toBe(20)
    })

    it('reset sets count back to 0', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()

      store.send(CounterIntents.plusClicked, { amount: 42 })
      await new Promise((r) => setTimeout(r, 0))
      expect(store.getState().count).toBe(42)

      store.send(CounterIntents.resetClicked, {})
      await new Promise((r) => setTimeout(r, 0))
      expect(store.getState().count).toBe(0)
    })
  })

  describe('Store.create options', () => {
    it('initialState deep merges with defaults', () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create({
        initialState: { count: 100 },
      })

      expect(store.getState().count).toBe(100)
      expect(store.getState().multiplier).toBe(2) // preserved from default
    })

    it('deps shallow merges with defaults', async () => {
      const overrideApi = { fetch: vi.fn().mockResolvedValue('override-data') }

      const AsyncStoreDef = Store({
        state: {
          data: null as string | null,
          loading: false,
          error: null as string | null,
        },
      })
        .deps<{ api: { fetch: (id: string) => Promise<string> } }>()
        .on(AsyncEvent, {
          loadRequested: (state) => ({
            ...state,
            loading: true,
            error: null,
          }),
          loaded: (state, { data }) => ({
            ...state,
            data,
            loading: false,
          }),
          loadFailed: (state, { error }) => ({
            ...state,
            loading: false,
            error,
          }),
        })
        .intents(AsyncIntents)
        .executors(LoadExecutor)

      const store = AsyncStoreDef.create({ deps: { api: overrideApi } })

      store.send(AsyncIntents.load, { id: '1' })
      await new Promise((r) => setTimeout(r, 50))

      expect(overrideApi.fetch).toHaveBeenCalledWith('1')
      expect(store.getState().data).toBe('override-data')
    })
  })

  describe('async executors', () => {
    it('handles async success flow', async () => {
      const mockApi = { fetch: vi.fn().mockResolvedValue('loaded-data') }
      const store = createAsyncStore(mockApi)

      store.send(AsyncIntents.load, { id: 'abc' })

      // After loadRequested, before await
      expect(store.getState().loading).toBe(true)

      await new Promise((r) => setTimeout(r, 50))

      expect(store.getState().data).toBe('loaded-data')
      expect(store.getState().loading).toBe(false)
      expect(store.getState().error).toBeNull()
    })

    it('handles async failure flow', async () => {
      const mockApi = { fetch: vi.fn().mockRejectedValue(new Error('network error')) }
      const store = createAsyncStore(mockApi)

      store.send(AsyncIntents.load, { id: 'abc' })
      await new Promise((r) => setTimeout(r, 50))

      expect(store.getState().loading).toBe(false)
      expect(store.getState().error).toBe('Error: network error')
    })
  })

  describe('subscribe', () => {
    it('notifies state subscribers on state change', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()
      const states: Array<ReturnType<typeof store.getState>> = []

      store.subscribe((state) => states.push({ ...state }))

      store.send(CounterIntents.plusClicked, { amount: 1 })
      await new Promise((r) => setTimeout(r, 0))

      expect(states.length).toBeGreaterThan(0)
      expect(states[0]!.count).toBe(1)
    })

    it('unsubscribe stops notifications', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()
      const cb = vi.fn()

      const unsub = store.subscribe(cb)
      unsub()

      store.send(CounterIntents.plusClicked, { amount: 1 })
      await new Promise((r) => setTimeout(r, 0))

      expect(cb).not.toHaveBeenCalled()
    })

    it('event subscribers receive events', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()
      const events: Array<import('./events').EventInstance> = []

      store.subscribe('events', (event) => events.push(event))

      store.send(CounterIntents.plusClicked, { amount: 5 })
      await new Promise((r) => setTimeout(r, 0))

      expect(events).toEqual([
        CounterEvent.incremented({ amount: 5 }),
      ])
    })
  })

  describe('cancel', () => {
    it('cancel(ref) aborts specific intent', async () => {
      const mockApi = {
        fetch: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('data'), 100)),
        ),
      }
      const store = createAsyncStore(mockApi)

      const ref = store.send(AsyncIntents.load, { id: '1' })
      store.cancel(ref)

      await new Promise((r) => setTimeout(r, 150))

      // Data should not be loaded because the signal was aborted
      expect(store.getState().data).toBeNull()
    })

    it('cancelAll aborts all running executors', async () => {
      const mockApi = {
        fetch: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('data'), 100)),
        ),
      }
      const store = createAsyncStore(mockApi)

      store.send(AsyncIntents.load, { id: '1' })
      store.send(AsyncIntents.load, { id: '2' })
      store.cancelAll()

      await new Promise((r) => setTimeout(r, 150))

      expect(store.getState().data).toBeNull()
    })
  })

  describe('dispose', () => {
    it('send after dispose throws', () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()
      store.dispose()

      expect(() => {
        store.send(CounterIntents.plusClicked, { amount: 1 })
      }).toThrow('[hurum] Cannot send intent to a disposed store')
    })

    it('dispose cancels all running executors', async () => {
      const mockApi = {
        fetch: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('data'), 100)),
        ),
      }
      const store = createAsyncStore(mockApi)

      store.send(AsyncIntents.load, { id: '1' })
      store.dispose()

      await new Promise((r) => setTimeout(r, 150))
      // Should not crash, emit is silently ignored after dispose
    })
  })

  describe('relay', () => {
    it('relays events to trigger further state changes', async () => {
      const ParentEvent = Events('Parent', {
        saved: Event<{ id: string }>(),
        notified: Event<{ parentId: string }>(),
      })

      const [SaveCmd, SaveExec] = CommandExecutor<{ id: string }>((cmd, { emit }) => {
        emit(ParentEvent.saved(cmd))
      })
      const ParentIntents = Intents('Parent', {
        save: Intent(SaveCmd),
      })

      const ParentStore = Store({
        state: {
          savedId: null as string | null,
          notifiedId: null as string | null,
        },
      })
        .on(ParentEvent.saved, (state, { id }) => ({
          ...state,
          savedId: id,
        }))
        .on(ParentEvent.notified, (state, { parentId }) => ({
          ...state,
          notifiedId: parentId,
        }))
        .relay(ParentEvent.saved, (event) => [
          ParentEvent.notified({ parentId: event.id }),
        ])
        .intents(ParentIntents)
        .executors(SaveExec)

      const store = ParentStore.create()
      store.send(ParentIntents.save, { id: 'abc' })
      await new Promise((r) => setTimeout(r, 0))

      expect(store.getState().savedId).toBe('abc')
      expect(store.getState().notifiedId).toBe('abc')
    })

    it('prevents circular relay', async () => {
      const CircularEvent = Events('Circular', {
        a: Event<{}>(),
        b: Event<{}>(),
      })

      const [CmdA, ExecA] = CommandExecutor<{}>((cmd, { emit }) => {
        emit(CircularEvent.a(cmd))
      })
      const CircularIntents = Intents('Circular', {
        start: Intent(CmdA),
      })

      const CircularStore = Store({ state: { aCount: 0, bCount: 0 } })
        .on(CircularEvent.a, (state) => ({ ...state, aCount: state.aCount + 1 }))
        .on(CircularEvent.b, (state) => ({ ...state, bCount: state.bCount + 1 }))
        .relay(CircularEvent.a, () => [CircularEvent.b({})])
        .relay(CircularEvent.b, () => [CircularEvent.a({})])
        .intents(CircularIntents)
        .executors(ExecA)

      const store = CircularStore.create()
      store.send(CircularIntents.start, {})
      await new Promise((r) => setTimeout(r, 0))

      // Should not infinite loop — circular relay prevented
      // Flow: A emitted (aCount=1) → relay A→B → B emitted (bCount=1)
      //        → relay B→A → A emitted again (aCount=2)
      //        → relay A is blocked (A is still in processing chain)
      expect(store.getState().aCount).toBe(2)
      expect(store.getState().bCount).toBe(1)
    })
  })

  describe('computed', () => {
    it('recomputes on state change', async () => {
      const CounterStore = createCounterStore()
      const store = CounterStore.create()

      store.send(CounterIntents.plusClicked, { amount: 3 })
      await new Promise((r) => setTimeout(r, 0))

      const s1 = store.getState()
      expect(s1.doubled).toBe(6)
      expect(s1.product).toBe(6)

      store.send(CounterIntents.plusClicked, { amount: 2 })
      await new Promise((r) => setTimeout(r, 0))

      const s2 = store.getState()
      expect(s2.doubled).toBe(10)
      expect(s2.product).toBe(10)
    })
  })

  describe('middleware', () => {
    it('calls middleware hooks', async () => {
      const onEvent = vi.fn()
      const onStateChange = vi.fn()
      const onIntentStart = vi.fn()
      const onIntentEnd = vi.fn()

      const mw: Middleware = {
        name: 'test-middleware',
        onEvent,
        onStateChange,
        onIntentStart,
        onIntentEnd,
      }

      const CounterStore = Store({ state: { count: 0, multiplier: 1 } })
        .on(CounterEvent.incremented, (state, { amount }) => ({
          ...state,
          count: state.count + amount,
        }))
        .intents(CounterIntents)
        .executors(IncrementExecutor)
        .middleware(mw)

      const store = CounterStore.create()
      store.send(CounterIntents.plusClicked, { amount: 1 })
      await new Promise((r) => setTimeout(r, 50))

      expect(onIntentStart).toHaveBeenCalled()
      expect(onEvent).toHaveBeenCalled()
      expect(onStateChange).toHaveBeenCalled()
      expect(onIntentEnd).toHaveBeenCalled()
    })
  })

  describe('sequential intent', () => {
    it('executes commands sequentially, skips on throw', async () => {
      const SeqEvent = Events('Seq', {
        validated: Event<{}>(),
        validationFailed: Event<{ error: string }>(),
        saved: Event<{}>(),
      })

      const [ValidateCmd, ValidateExec] = CommandExecutor<{ valid: boolean }>((command, { emit }) => {
        if (!command.valid) {
          emit(SeqEvent.validationFailed({ error: 'invalid' }))
          throw new Error('Validation failed')
        }
        emit(SeqEvent.validated({}))
      })

      const [SaveCmd, SaveExec] = CommandExecutor<{}>((cmd, { emit }) => {
        emit(SeqEvent.saved(cmd))
      })

      const SeqIntents = Intents('Seq', {
        submit: Intent(ValidateCmd, SaveCmd),
      })

      const SeqStore = Store({
        state: { validated: false, saved: false, error: null as string | null },
      })
        .on(SeqEvent.validated, (state) => ({ ...state, validated: true }))
        .on(SeqEvent.saved, (state) => ({ ...state, saved: true }))
        .on(SeqEvent.validationFailed, (state, { error }) => ({ ...state, error }))
        .intents(SeqIntents)
        .executors(ValidateExec, SaveExec)

      // Test failure case — save should not execute
      const store1 = SeqStore.create()
      store1.send(SeqIntents.submit, { valid: false })
      await new Promise((r) => setTimeout(r, 50))

      expect(store1.getState().error).toBe('invalid')
      expect(store1.getState().saved).toBe(false)

      // Test success case — both execute
      const store2 = SeqStore.create()
      store2.send(SeqIntents.submit, { valid: true })
      await new Promise((r) => setTimeout(r, 50))

      expect(store2.getState().validated).toBe(true)
      expect(store2.getState().saved).toBe(true)
    })
  })

  describe('Intent.allSettled', () => {
    it('runs commands independently, failures do not affect others', async () => {
      const IndEvent = Events('Ind', {
        aLoaded: Event<{}>(),
        aFailed: Event<{}>(),
        bLoaded: Event<{}>(),
      })

      const [CmdA, ExecA] = CommandExecutor<{}>(() => {
        throw new Error('A failed')
      })

      const [CmdB, ExecB] = CommandExecutor<{}>((cmd, { emit }) => {
        emit(IndEvent.bLoaded(cmd))
      })

      const IndIntents = Intents('Ind', {
        init: Intent.allSettled(CmdA, CmdB),
      })

      const IndStore = Store({ state: { bLoaded: false } })
        .on(IndEvent.bLoaded, (state) => ({ ...state, bLoaded: true }))
        .intents(IndIntents)
        .executors(ExecA, ExecB)

      const store = IndStore.create()
      store.send(IndIntents.init, {})
      await new Promise((r) => setTimeout(r, 50))

      // B should still succeed even though A failed
      expect(store.getState().bLoaded).toBe(true)
    })
  })

  // ── send(PreparedIntent) ────────────────────────────────────────

  describe('send(PreparedIntent)', () => {
    it('dispatches via PreparedIntent', () => {
      const store = createCounterStore().create()
      const prepared = CounterIntents.plusClicked({ amount: 5 })
      expect(isPreparedIntent(prepared)).toBe(true)
      store.send(prepared)
      expect(store.getState().count).toBe(5)
      store.dispose()
    })

    it('still supports legacy send(intent, payload)', () => {
      const store = createCounterStore().create()
      store.send(CounterIntents.plusClicked, { amount: 3 })
      expect(store.getState().count).toBe(3)
      store.dispose()
    })
  })

  // ── send.intentName() shorthand ─────────────────────────────────

  describe('send.intentName()', () => {
    it('dispatches via named shorthand', () => {
      const store = createCounterStore().create()
      store.send.plusClicked({ amount: 7 })
      expect(store.getState().count).toBe(7)
      store.dispose()
    })

    it('works with multiple intents', () => {
      const store = createCounterStore().create()
      store.send.plusClicked({ amount: 10 })
      store.send.minusClicked({ amount: 3 })
      expect(store.getState().count).toBe(7)
      store.dispose()
    })

    it('returns undefined for unregistered intent name', () => {
      const store = createCounterStore().create()
      expect((store.send as Record<string, unknown>)['nonExistent']).toBeUndefined()
      store.dispose()
    })
  })

  // ── Intent with EventCreator (direct emit) ─────────────────────

  describe('Intent with EventCreator', () => {
    it('emits event directly from EventCreator in intent', () => {
      const E = Events('Direct', { happened: Event<{ value: number }>() })
      const I = Intents('Direct', { act: Intent(E.happened) })
      const store = Store({ state: { value: 0 } })
        .on(E, { happened: (_state, { value }) => ({ value }) })
        .intents(I)
        .create()

      store.send.act({ value: 42 })
      expect(store.getState().value).toBe(42)

      store.dispose()
    })

    it('executes mixed Command + EventCreator in sequence', async () => {
      const E = Events('Mix', {
        validated: Event<{ ok: boolean }>(),
        saved: Event<{ ok: boolean }>(),
      })

      const [ValidateCmd, ValidateExec] = CommandExecutor<{ ok: boolean }>(
        'Validate',
        (payload, { emit }) => { emit(E.validated(payload)) },
      )

      const I = Intents('Mix', {
        submit: Intent(ValidateCmd, E.saved),
      })

      const store = Store({ state: { validated: false, saved: false } })
        .on(E, {
          validated: (state) => ({ ...state, validated: true }),
          saved: (state) => ({ ...state, saved: true }),
        })
        .intents(I)
        .executors(ValidateExec)
        .create()

      store.send.submit({ ok: true })
      await new Promise((r) => setTimeout(r, 10))
      expect(store.getState()).toEqual({ validated: true, saved: true })

      store.dispose()
    })

    it('handles EventCreator in Intent.all', async () => {
      const E = Events('Par', {
        a: Event<Record<string, never>>(),
        b: Event<Record<string, never>>(),
      })
      const I = Intents('Par', { both: Intent.all(E.a, E.b) })
      const store = Store({ state: { a: false, b: false } })
        .on(E, {
          a: (state) => ({ ...state, a: true }),
          b: (state) => ({ ...state, b: true }),
        })
        .intents(I)
        .create()

      store.send.both({})
      await new Promise((r) => setTimeout(r, 10))
      expect(store.getState()).toEqual({ a: true, b: true })

      store.dispose()
    })

    it('handles EventCreator in Intent.allSettled', async () => {
      const E = Events('Settled', {
        good: Event<Record<string, never>>(),
      })
      const I = Intents('Settled', { act: Intent.allSettled(E.good) })
      const store = Store({ state: { good: false } })
        .on(E, { good: (state) => ({ ...state, good: true }) })
        .intents(I)
        .create()

      store.send.act({})
      await new Promise((r) => setTimeout(r, 10))
      expect(store.getState().good).toBe(true)

      store.dispose()
    })

    it('respects abort signal for EventCreator steps', async () => {
      const E = Events('Abort', {
        first: Event<Record<string, never>>(),
        second: Event<Record<string, never>>(),
      })

      const [SlowCmd, SlowExec] = CommandExecutor<Record<string, never>>(
        'Slow',
        async (_payload, { emit, signal }) => {
          await new Promise((r) => setTimeout(r, 50))
          if (!signal.aborted) emit(E.first({}))
        },
      )

      // Sequential: SlowCmd → E.second. If cancelled during SlowCmd, E.second should not fire
      const I = Intents('Abort', { act: Intent(SlowCmd, E.second) })
      const store = Store({ state: { second: false } })
        .on(E, {
          first: (state) => state,
          second: (state) => ({ ...state, second: true }),
        })
        .intents(I)
        .executors(SlowExec)
        .create()

      const ref = store.send.act({})
      store.cancel(ref)
      await new Promise((r) => setTimeout(r, 100))
      expect(store.getState().second).toBe(false)

      store.dispose()
    })
  })

})
