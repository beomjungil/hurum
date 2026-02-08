import { describe, it, expect } from 'vitest'
import { Intents, Intent, isIntentDescriptor, isIntentsContainer, isPreparedIntent } from './intent'
import { CommandExecutor } from './command-executor'
import { Events, Event } from './events'

const TestEvent = Events('Test', {
  a: Event<{}>(),
  b: Event<{}>(),
  c: Event<{}>(),
})

const [CmdA, _ExecA] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(TestEvent.a(cmd))
})
const [CmdB, _ExecB] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(TestEvent.b(cmd))
})
const [CmdC, _ExecC] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(TestEvent.c(cmd))
})

describe('Intent', () => {
  it('creates a sequential intent descriptor', () => {
    const intent = Intent(CmdA, CmdB)
    expect(intent.mode).toBe('sequential')
    expect(intent.steps).toEqual([CmdA, CmdB])
    expect(isIntentDescriptor(intent)).toBe(true)
  })

  it('creates a single-command intent', () => {
    const intent = Intent(CmdA)
    expect(intent.mode).toBe('sequential')
    expect(intent.steps).toEqual([CmdA])
  })
})

describe('Intent.all', () => {
  it('creates a parallel fail-fast intent', () => {
    const intent = Intent.all(CmdA, CmdB)
    expect(intent.mode).toBe('all')
    expect(intent.steps).toEqual([CmdA, CmdB])
  })
})

describe('Intent.allSettled', () => {
  it('creates a parallel independent intent', () => {
    const intent = Intent.allSettled(CmdA, CmdB, CmdC)
    expect(intent.mode).toBe('allSettled')
    expect(intent.steps).toEqual([CmdA, CmdB, CmdC])
  })
})

describe('Intents', () => {
  it('creates a namespaced intents container', () => {
    const intents = Intents('Test', {
      first: Intent(CmdA),
      second: Intent(CmdB, CmdC),
    })

    expect(isIntentsContainer(intents)).toBe(true)
    expect(isIntentDescriptor(intents.first)).toBe(true)
    expect(isIntentDescriptor(intents.second)).toBe(true)
    expect(intents.first.steps).toEqual([CmdA])
    expect(intents.second.steps).toEqual([CmdB, CmdC])
  })

  it('auto-sets name on each IntentDescriptor as prefix/key', () => {
    const intents = Intents('Purchase', {
      submitClicked: Intent(CmdA, CmdB),
      pageOpened: Intent(CmdC),
    })

    expect(intents.submitClicked.name).toBe('Purchase/submitClicked')
    expect(intents.pageOpened.name).toBe('Purchase/pageOpened')
  })

  it('IntentDescriptor has no name before Intents() builder', () => {
    const intent = Intent(CmdA)
    expect(intent.name).toBeUndefined()
  })
})

// ── IntentAction & PreparedIntent ─────────────────────────────────

describe('IntentAction (callable)', () => {
  it('calling an IntentAction produces a PreparedIntent', () => {
    const intent = Intent(CmdA)
    const prepared = intent({})
    expect(isPreparedIntent(prepared)).toBe(true)
    expect(prepared.intent).toBe(intent)
    expect(prepared.payload).toEqual({})
  })

  it('PreparedIntent preserves payload', () => {
    const [Cmd] = CommandExecutor<{ id: number }>((cmd, { emit }) => {
      emit(Events('P', { e: Event<{ id: number }>() }).e(cmd))
    })
    const intent = Intent(Cmd)
    const prepared = intent({ id: 42 })
    expect(prepared.payload).toEqual({ id: 42 })
  })

  it('isPreparedIntent returns false for non-prepared values', () => {
    expect(isPreparedIntent(null)).toBe(false)
    expect(isPreparedIntent(42)).toBe(false)
    expect(isPreparedIntent({})).toBe(false)
    expect(isPreparedIntent(Intent(CmdA))).toBe(false)
  })

  it('IntentAction retains descriptor properties', () => {
    const intent = Intent(CmdA, CmdB)
    expect(typeof intent).toBe('function')
    expect(intent.mode).toBe('sequential')
    expect(intent.steps).toEqual([CmdA, CmdB])
    expect(isIntentDescriptor(intent)).toBe(true)
  })

  it('Intent.all / Intent.allSettled also return callable IntentAction', () => {
    const a = Intent.all(CmdA)
    const b = Intent.allSettled(CmdA)
    expect(typeof a).toBe('function')
    expect(typeof b).toBe('function')
    expect(isPreparedIntent(a({}))).toBe(true)
    expect(isPreparedIntent(b({}))).toBe(true)
  })
})

// ── Intent with EventCreator ─────────────────────────────────────

describe('Intent with EventCreator', () => {
  it('accepts EventCreator directly', () => {
    const intent = Intent(TestEvent.a)
    expect(intent.steps).toEqual([TestEvent.a])
    expect(intent.mode).toBe('sequential')
    expect(isIntentDescriptor(intent)).toBe(true)
  })

  it('accepts mixed Command and EventCreator', () => {
    const intent = Intent(CmdA, TestEvent.b, CmdC)
    expect(intent.steps).toEqual([CmdA, TestEvent.b, CmdC])
  })

  it('Intent.all accepts EventCreator', () => {
    const intent = Intent.all(TestEvent.a, TestEvent.b)
    expect(intent.mode).toBe('all')
    expect(intent.steps).toEqual([TestEvent.a, TestEvent.b])
  })

  it('Intent.allSettled accepts EventCreator', () => {
    const intent = Intent.allSettled(TestEvent.a, CmdB)
    expect(intent.mode).toBe('allSettled')
    expect(intent.steps).toEqual([TestEvent.a, CmdB])
  })

  it('callable EventCreator intent produces PreparedIntent', () => {
    const intent = Intent(TestEvent.a)
    const prepared = intent({})
    expect(isPreparedIntent(prepared)).toBe(true)
    expect(prepared.intent).toBe(intent)
  })
})

