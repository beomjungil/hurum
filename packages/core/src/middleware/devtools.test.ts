import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Events, Event } from '../events'
import { CommandExecutor } from '../command-executor'
import { Intents, Intent } from '../intent'
import { Store } from '../store'
import { devtools } from './devtools'

// ── Setup ────────────────────────────────────────────────────────────

const TestEvent = Events('DT', {
  happened: Event<{ value: number }>(),
})

const [HappenCmd, HappenExec] = CommandExecutor<{ value: number }>((cmd, { emit }) => {
  emit(TestEvent.happened(cmd))
})

const TestIntents = Intents('DT', {
  doIt: Intent(HappenCmd),
})

function createMockDevToolsExtension() {
  const instance = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
  const extension = {
    connect: vi.fn(() => instance),
  }
  return { extension, instance }
}

/** Shape of globalThis when Redux DevTools extension is present */
interface GlobalWithDevTools {
  __REDUX_DEVTOOLS_EXTENSION__?: {
    connect(options?: { name?: string }): {
      init(state: unknown): void
      send(action: unknown, state: unknown): void
      subscribe(listener: (message: unknown) => void): (() => void) | void
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('devtools middleware', () => {
  let originalDevTools: GlobalWithDevTools['__REDUX_DEVTOOLS_EXTENSION__']

  beforeEach(() => {
    originalDevTools = (globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__
  })

  afterEach(() => {
    if (originalDevTools !== undefined) {
      ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = originalDevTools
    } else {
      delete (globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__
    }
  })

  it('connects to Redux DevTools extension and sends init', () => {
    const { extension, instance } = createMockDevToolsExtension()
    ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = extension

    const handle = devtools({ name: 'TestStore' })

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    expect(extension.connect).toHaveBeenCalledWith({ name: 'TestStore' })
    expect(instance.init).toHaveBeenCalledWith(expect.objectContaining({ value: 0 }))
  })

  it('sends events as actions to devtools', async () => {
    const { extension, instance } = createMockDevToolsExtension()
    ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = extension

    const handle = devtools()

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    store.send(TestIntents.doIt, { value: 42 })
    await new Promise((r) => setTimeout(r, 0))

    // Should send the event
    expect(instance.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DT/happened' }),
      expect.objectContaining({ value: 42 }),
    )
  })

  it('sends intent start to devtools', async () => {
    const { extension, instance } = createMockDevToolsExtension()
    ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = extension

    const handle = devtools()

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    store.send(TestIntents.doIt, { value: 1 })
    await new Promise((r) => setTimeout(r, 50))

    // Should have sent an intent start action
    const calls = instance.send.mock.calls as Array<[{ type: string; payload?: unknown }, unknown]>
    const intentCall = calls.find(
      (c) => typeof c[0].type === 'string' && c[0].type.startsWith('[Intent]'),
    )
    expect(intentCall).toBeDefined()
  })

  it('sends errors to devtools', async () => {
    const { extension, instance } = createMockDevToolsExtension()
    ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = extension

    Events('DTFail', { failed: Event<{}>() })
    const [FailCmd, FailExec] = CommandExecutor<{}>(() => {
      throw new Error('boom')
    })
    const FailIntents = Intents('DTFail', { fail: Intent(FailCmd) })

    const handle = devtools()

    const store = Store({ state: {} })
      .intents(FailIntents)
      .executors(FailExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    store.send(FailIntents.fail, {})
    await new Promise((r) => setTimeout(r, 50))

    const calls = instance.send.mock.calls as Array<[{ type: string; payload?: unknown }, unknown]>
    const errorCall = calls.find(
      (c) => typeof c[0].type === 'string' && c[0].type.startsWith('[Error]'),
    )
    expect(errorCall).toBeDefined()
  })

  it('works without devtools extension (no-op)', async () => {
    delete (globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__

    const handle = devtools()

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    // Should not throw
    store.send(TestIntents.doIt, { value: 10 })
    await new Promise((r) => setTimeout(r, 0))

    expect(store.getState().value).toBe(10)
  })

  it('subscribes to devtools for time-travel messages', () => {
    const { extension, instance } = createMockDevToolsExtension()
    ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = extension

    const handle = devtools()

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    expect(instance.subscribe).toHaveBeenCalled()
  })

  it('uses default name when none provided', () => {
    const { extension } = createMockDevToolsExtension()
    ;(globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__ = extension

    const handle = devtools()
    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(handle.middleware)
      .create()

    handle.connect(store)

    expect(extension.connect).toHaveBeenCalledWith({ name: 'Hurum Store' })
  })
})
