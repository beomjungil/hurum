import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Events, Event } from '../events'
import { CommandExecutor } from '../command-executor'
import { Intents, Intent } from '../intent'
import { Store } from '../store'
import { logger } from './logger'

// ── Setup ────────────────────────────────────────────────────────────

const TestEvent = Events('Test', {
  happened: Event<{ value: number }>(),
  other: Event<{ label: string }>(),
})

const [HappenCmd, HappenExec] = CommandExecutor<{ value: number }>((cmd, { emit }) => {
  emit(TestEvent.happened(cmd))
})
const [OtherCmd, OtherExec] = CommandExecutor<{ label: string }>((cmd, { emit }) => {
  emit(TestEvent.other(cmd))
})

const TestIntents = Intents('Test', {
  doIt: Intent(HappenCmd),
  doOther: Intent(OtherCmd),
})

// ── Tests ────────────────────────────────────────────────────────────

describe('logger middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls console.group/log/groupEnd on event', async () => {
    const group = vi.spyOn(console, 'group').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const groupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(logger())
      .create()

    store.send(TestIntents.doIt, { value: 42 })
    await new Promise((r) => setTimeout(r, 0))

    expect(group).toHaveBeenCalledWith('[Event] Test/happened')
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'Test/happened', value: 42 }))
    expect(log).toHaveBeenCalledWith('State:', expect.objectContaining({ value: 42 }))
    expect(groupEnd).toHaveBeenCalled()
  })

  it('calls onStateChange with prev and next', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(logger())
      .create()

    store.send(TestIntents.doIt, { value: 10 })
    await new Promise((r) => setTimeout(r, 0))

    expect(log).toHaveBeenCalledWith(
      '[State Change]',
      expect.objectContaining({
        prev: expect.objectContaining({ value: 0 }),
        next: expect.objectContaining({ value: 10 }),
      }),
    )
  })

  it('calls onIntentStart and onIntentEnd', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

    const store = Store({ state: { value: 0 } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
      })
      .intents(TestIntents)
      .executors(HappenExec)
      .middleware(logger())
      .create()

    store.send(TestIntents.doIt, { value: 1 })
    await new Promise((r) => setTimeout(r, 50))

    expect(log).toHaveBeenCalledWith('[Intent Start]', expect.anything(), { value: 1 })
    expect(log).toHaveBeenCalledWith('[Intent End]', expect.anything(), { value: 1 })
  })

  it('calls onError on executor failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    Events('Fail', { failed: Event<{}>() })
    const [FailCmd, FailExec] = CommandExecutor<{}>(() => {
      throw new Error('boom')
    })
    const FailIntents = Intents('Fail', { fail: Intent(FailCmd) })

    const store = Store({ state: {} })
      .intents(FailIntents)
      .executors(FailExec)
      .middleware(logger())
      .create()

    store.send(FailIntents.fail, {})
    await new Promise((r) => setTimeout(r, 50))

    expect(consoleError).toHaveBeenCalledWith(
      '[Error]',
      expect.any(Error),
      expect.anything(),
    )
  })

  it('filter option excludes events from logging', async () => {
    const group = vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

    const store = Store({ state: { value: 0, label: '' } })
      .on(TestEvent, {
        happened: (state, { value }) => ({ ...state, value }),
        other: (state, { label }) => ({ ...state, label }),
      })
      .intents(TestIntents)
      .executors(HappenExec, OtherExec)
      .middleware(
        logger({ filter: (event) => event.type === TestEvent.happened.type }),
      )
      .create()

    store.send(TestIntents.doOther, { label: 'hello' })
    await new Promise((r) => setTimeout(r, 0))

    // "other" event should not be logged because filter rejects it
    expect(group).not.toHaveBeenCalledWith('[Event] Test/other')

    store.send(TestIntents.doIt, { value: 99 })
    await new Promise((r) => setTimeout(r, 0))

    // "happened" event should be logged
    expect(group).toHaveBeenCalledWith('[Event] Test/happened')
  })
})
