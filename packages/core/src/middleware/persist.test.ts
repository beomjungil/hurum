import { describe, it, expect, vi } from 'vitest'
import { Events, Event } from '../events'
import { CommandExecutor } from '../command-executor'
import { Intents, Intent } from '../intent'
import { Store } from '../store'
import { persist } from './persist'

// ── Setup ────────────────────────────────────────────────────────────

const TestEvent = Events('Persist', {
  updated: Event<{ value: number }>(),
  named: Event<{ name: string }>(),
})

const [UpdateCmd, UpdateExec] = CommandExecutor<{ value: number }>((cmd, { emit }) => {
  emit(TestEvent.updated(cmd))
})
const [NameCmd, NameExec] = CommandExecutor<{ name: string }>((cmd, { emit }) => {
  emit(TestEvent.named(cmd))
})

const TestIntents = Intents('Persist', {
  update: Intent(UpdateCmd),
  setName: Intent(NameCmd),
})

function createMockStorage(): Pick<Storage, 'getItem' | 'setItem'> & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return {
    data,
    getItem: vi.fn((key: string) => data[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { data[key] = value }),
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('persist middleware', () => {
  it('saves state to storage on state change', async () => {
    const storage = createMockStorage()
    const { middleware } = persist({ key: 'test-store', storage })

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(UpdateExec)
      .middleware(middleware)
      .create()

    store.send(TestIntents.update, { value: 42 })
    await new Promise((r) => setTimeout(r, 0))

    expect(storage.setItem).toHaveBeenCalledWith('test-store', expect.any(String))
    const saved = JSON.parse(storage.data['test-store']!) as Record<string, unknown>
    expect(saved.value).toBe(42)
  })

  it('getPersistedState returns saved state', async () => {
    const storage = createMockStorage()
    const handle = persist({ key: 'test-store', storage })

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(UpdateExec)
      .middleware(handle.middleware)
      .create()

    store.send(TestIntents.update, { value: 77 })
    await new Promise((r) => setTimeout(r, 0))

    const persisted = handle.getPersistedState()
    expect(persisted).not.toBeNull()
    expect(persisted!.value).toBe(77)
  })

  it('getPersistedState returns null when no data persisted', () => {
    const storage = createMockStorage()
    const handle = persist({ key: 'empty-key', storage })
    expect(handle.getPersistedState()).toBeNull()
  })

  it('pick option saves only specified keys', async () => {
    const storage = createMockStorage()
    const { middleware } = persist({ key: 'test-pick', storage, pick: ['value'] })

    const store = Store({ state: { value: 0, name: 'initial' } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
        named: (state, { name }) => ({ ...state, name }),
      })
      .intents(TestIntents)
      .executors(UpdateExec, NameExec)
      .middleware(middleware)
      .create()

    store.send(TestIntents.setName, { name: 'hello' })
    await new Promise((r) => setTimeout(r, 0))

    // setName triggers state change, but only 'value' should be persisted
    const saved = JSON.parse(storage.data['test-pick']!) as Record<string, unknown>
    expect(saved).toEqual({ value: 0 })
    expect(saved.name).toBeUndefined()
  })

  it('custom serialize/deserialize', async () => {
    const storage = createMockStorage()
    const customSerialize = vi.fn((state: Record<string, unknown>) => `custom:${JSON.stringify(state)}`)
    const customDeserialize = vi.fn((raw: string) => JSON.parse(raw.replace('custom:', '')) as Record<string, unknown>)

    const handle = persist({
      key: 'test-custom',
      storage,
      serialize: customSerialize,
      deserialize: customDeserialize,
    })

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(UpdateExec)
      .middleware(handle.middleware)
      .create()

    store.send(TestIntents.update, { value: 5 })
    await new Promise((r) => setTimeout(r, 0))

    expect(customSerialize).toHaveBeenCalled()
    expect(storage.data['test-custom']).toMatch(/^custom:/)

    const persisted = handle.getPersistedState()
    expect(customDeserialize).toHaveBeenCalled()
    expect(persisted!.value).toBe(5)
  })

  it('silently handles storage errors on save', async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => { throw new Error('QuotaExceeded') }),
    }
    const { middleware } = persist({ key: 'fail-key', storage })

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(UpdateExec)
      .middleware(middleware)
      .create()

    // Should not throw
    store.send(TestIntents.update, { value: 1 })
    await new Promise((r) => setTimeout(r, 0))

    expect(store.getState().value).toBe(1)
  })

  it('silently handles corrupted data on read', () => {
    const storage = {
      getItem: vi.fn(() => 'not-valid-json{{{'),
      setItem: vi.fn(),
    }
    const handle = persist({ key: 'corrupt', storage })
    expect(handle.getPersistedState()).toBeNull()
  })

  it('persisted state can be used as initialState for new store', async () => {
    const storage = createMockStorage()
    const handle = persist({ key: 'rehydrate-test', storage })

    // First store: make some changes
    const store1 = Store({ state: { value: 0 } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(UpdateExec)
      .middleware(handle.middleware)
      .create()

    store1.send(TestIntents.update, { value: 123 })
    await new Promise((r) => setTimeout(r, 0))

    // Read persisted state
    const persisted = handle.getPersistedState()
    expect(persisted!.value).toBe(123)

    // Create second store with persisted state as initialState
    const store2 = Store({ state: { value: 0 } })
      .on(TestEvent, {
        updated: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(UpdateExec)
      .middleware(handle.middleware)
      .create({ initialState: persisted as { value: number } })

    expect(store2.getState().value).toBe(123)
  })
})
