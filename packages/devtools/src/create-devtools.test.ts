import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDevtools } from './create-devtools'
import { getRegisteredHandles } from './registry'
import type { DevtoolsHandle } from './types'
import type { IntentDescriptor, IntentMode } from '@hurum/core'

function makeIntent(mode: IntentMode = 'sequential'): IntentDescriptor {
  return { steps: [], mode } as unknown as IntentDescriptor
}

describe('createDevtools', () => {
  const handles: DevtoolsHandle[] = []

  function tracked(dt: DevtoolsHandle): DevtoolsHandle {
    handles.push(dt)
    return dt
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    for (const h of handles) h.dispose()
    handles.length = 0
  })

  it('returns a handle with middleware named hurum-devtools', () => {
    const dt = tracked(createDevtools())
    expect(dt.middleware.name).toBe('hurum-devtools')
  })

  it('starts with empty entries and transactions', () => {
    const dt = tracked(createDevtools())
    expect(dt.getEntries()).toEqual([])
    expect(dt.getTransactions()).toEqual([])
  })

  it('records intent-start entry', () => {
    const dt = tracked(createDevtools())
    const intent = makeIntent()
    dt.middleware.onIntentStart!(intent, { foo: 'bar' })

    const entries = dt.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].type).toBe('intent-start')
    expect(entries[0].intentMode).toBe('sequential')
    expect(entries[0].intentPayload).toEqual({ foo: 'bar' })
    expect(entries[0].transactionId).toBe(0)
  })

  it('records event entry linked to active transaction', () => {
    const dt = tracked(createDevtools())
    const intent = makeIntent()
    dt.middleware.onIntentStart!(intent, {})
    dt.middleware.onEvent!(
      { type: 'Todo/created', title: 'test' } as any,
      { items: [] },
    )

    const entries = dt.getEntries()
    expect(entries).toHaveLength(2)
    expect(entries[1].type).toBe('event')
    expect(entries[1].eventType).toBe('Todo/created')
    expect(entries[1].transactionId).toBe(0)
  })

  it('records state-change entry', async () => {
    const dt = tracked(createDevtools())
    const intent = makeIntent()
    dt.middleware.onIntentStart!(intent, {})
    dt.middleware.onStateChange!({ count: 0 }, { count: 1 })

    // State-change entries are coalesced via microtask
    await Promise.resolve()

    const entries = dt.getEntries()
    expect(entries).toHaveLength(2)
    expect(entries[1].type).toBe('state-change')
    expect(entries[1].prevState).toEqual({ count: 0 })
    expect(entries[1].nextState).toEqual({ count: 1 })
    expect(entries[1].transactionId).toBe(0)
  })

  it('records intent-end and closes transaction', () => {
    const dt = tracked(createDevtools())
    const intent = makeIntent()
    dt.middleware.onIntentStart!(intent, {})
    dt.middleware.onEvent!({ type: 'Test/done' } as any, {})
    dt.middleware.onIntentEnd!(intent, {})

    const entries = dt.getEntries()
    expect(entries).toHaveLength(3)
    expect(entries[2].type).toBe('intent-end')
    expect(entries[2].transactionId).toBe(0)

    const txs = dt.getTransactions()
    expect(txs).toHaveLength(1)
    expect(txs[0].endEntryId).toBe(entries[2].id)
    expect(txs[0].endTimestamp).toBeGreaterThan(0)
    expect(txs[0].childEntryIds).toEqual([entries[1].id])
  })

  it('records error entry and marks transaction', () => {
    const dt = tracked(createDevtools())
    const intent = makeIntent()
    dt.middleware.onIntentStart!(intent, {})
    dt.middleware.onError!(new Error('boom'), {
      intent,
      payload: {},
    } as any)

    const entries = dt.getEntries()
    expect(entries).toHaveLength(2)
    expect(entries[1].type).toBe('error')
    expect(entries[1].error?.message).toBe('boom')

    const txs = dt.getTransactions()
    expect(txs[0].hasError).toBe(true)
  })

  it('correlates multiple intents independently', () => {
    const dt = tracked(createDevtools())
    const intent1 = makeIntent()
    const intent2 = makeIntent('all')

    dt.middleware.onIntentStart!(intent1, { a: 1 })
    dt.middleware.onIntentStart!(intent2, { b: 2 })
    dt.middleware.onEvent!({ type: 'E1' } as any, {})
    dt.middleware.onIntentEnd!(intent2, {})
    dt.middleware.onEvent!({ type: 'E2' } as any, {})
    dt.middleware.onIntentEnd!(intent1, {})

    const txs = dt.getTransactions()
    expect(txs).toHaveLength(2)

    // intent2 (tx=1) — E1 was captured while intent2 was on top of stack
    const tx2 = txs.find((t) => t.id === 1)!
    expect(tx2.intentMode).toBe('all')
    expect(tx2.endEntryId).not.toBeNull()

    // intent1 (tx=0) — E2 was captured after intent2 ended
    const tx1 = txs.find((t) => t.id === 0)!
    expect(tx1.endEntryId).not.toBeNull()
  })

  it('events without active intent have null transactionId', () => {
    const dt = tracked(createDevtools())
    dt.middleware.onEvent!({ type: 'Orphan' } as any, {})
    expect(dt.getEntries()[0].transactionId).toBeNull()
  })

  it('notifies subscribers on changes', () => {
    const dt = tracked(createDevtools())
    const cb = vi.fn()
    const unsub = dt.subscribe(cb)

    dt.middleware.onEvent!({ type: 'E' } as any, {})
    expect(cb).toHaveBeenCalledTimes(1)

    dt.middleware.onEvent!({ type: 'E2' } as any, {})
    expect(cb).toHaveBeenCalledTimes(2)

    unsub()
    dt.middleware.onEvent!({ type: 'E3' } as any, {})
    expect(cb).toHaveBeenCalledTimes(2) // no more calls after unsub
  })

  it('clear resets everything', () => {
    const dt = tracked(createDevtools())
    const intent = makeIntent()
    dt.middleware.onIntentStart!(intent, {})
    dt.middleware.onEvent!({ type: 'E' } as any, {})

    dt.clear()
    expect(dt.getEntries()).toEqual([])
    expect(dt.getTransactions()).toEqual([])
  })

  it('respects maxHistory', () => {
    const dt = tracked(createDevtools({ maxHistory: 3 }))
    for (let i = 0; i < 5; i++) {
      dt.middleware.onEvent!({ type: `E${i}` } as any, {})
    }
    const entries = dt.getEntries()
    expect(entries).toHaveLength(3)
    expect(entries[0].eventType).toBe('E2')
    expect(entries[2].eventType).toBe('E4')
  })

  it('getCurrentState returns latest state from middleware callbacks', () => {
    const dt = tracked(createDevtools())
    expect(dt.getCurrentState()).toBeNull()

    // State is captured from onStateChange
    dt.middleware.onStateChange!({ count: 0 }, { count: 42 })
    expect(dt.getCurrentState()).toEqual({ count: 42 })

    // Also captured from onEvent
    dt.middleware.onEvent!({ type: 'Test' } as any, { count: 99 })
    expect(dt.getCurrentState()).toEqual({ count: 99 })
  })

  it('returns noop handle in production mode', () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const dt = tracked(createDevtools())
      dt.middleware.onEvent?.({ type: 'E' } as any, {})
      expect(dt.getEntries()).toEqual([])
      expect(dt.name).toBe('Hurum Store')
    } finally {
      process.env.NODE_ENV = origEnv
    }
  })

  it('force option bypasses production check', () => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const dt = tracked(createDevtools({ force: true }))
      dt.middleware.onEvent?.({ type: 'E' } as any, {})
      expect(dt.getEntries()).toHaveLength(1)
    } finally {
      process.env.NODE_ENV = origEnv
    }
  })

  it('name defaults to Hurum Store', () => {
    const dt1 = tracked(createDevtools())
    const dt2 = tracked(createDevtools({ name: 'My App' }))
    expect(dt1.name).toBe('Hurum Store')
    expect(dt2.name).toBe('My App')
  })

  it('auto-registers in global registry', () => {
    const before = getRegisteredHandles().length
    const dt = tracked(createDevtools({ name: 'Auto' }))
    expect(getRegisteredHandles()).toHaveLength(before + 1)
    expect(getRegisteredHandles()).toContain(dt)
  })

  it('dispose removes from registry', () => {
    const dt = createDevtools({ name: 'Disposable' })
    const count = getRegisteredHandles().length
    expect(getRegisteredHandles()).toContain(dt)
    dt.dispose()
    expect(getRegisteredHandles()).toHaveLength(count - 1)
    expect(getRegisteredHandles()).not.toContain(dt)
  })
})
