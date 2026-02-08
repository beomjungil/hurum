import { describe, it, expect } from 'vitest'
import { Events, Event, isEventCreator } from './events'

describe('Events', () => {
  const CounterEvent = Events('Counter', {
    incremented: Event<{ amount: number }>(),
    decremented: Event<{ amount: number }>(),
    reset: Event<{}>(),
  })

  it('creates event creators with correct type strings', () => {
    expect(CounterEvent.incremented.type).toBe('Counter/incremented')
    expect(CounterEvent.decremented.type).toBe('Counter/decremented')
    expect(CounterEvent.reset.type).toBe('Counter/reset')
  })

  it('creates event instances with type and payload', () => {
    const event = CounterEvent.incremented({ amount: 5 })
    expect(event).toEqual({ type: 'Counter/incremented', amount: 5 })
  })

  it('creates event instances with empty payload', () => {
    const event = CounterEvent.reset({})
    expect(event).toEqual({ type: 'Counter/reset' })
  })

  it('type property is read-only', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(CounterEvent.incremented as { type: string }).type = 'changed'
    }).toThrow()
  })

  it('isEventCreator returns true for event creators', () => {
    expect(isEventCreator(CounterEvent.incremented)).toBe(true)
    expect(isEventCreator(CounterEvent.decremented)).toBe(true)
  })

  it('isEventCreator returns false for non-event-creators', () => {
    expect(isEventCreator({})).toBe(false)
    expect(isEventCreator(null)).toBe(false)
    expect(isEventCreator(() => {})).toBe(false)
    expect(isEventCreator('string')).toBe(false)
  })

  it('different prefixes create different types', () => {
    const A = Events('A', { done: Event<{}>() })
    const B = Events('B', { done: Event<{}>() })
    expect(A.done.type).toBe('A/done')
    expect(B.done.type).toBe('B/done')
    expect(A.done.type).not.toBe(B.done.type)
  })

  it('event payload properties are spread onto the instance', () => {
    const event = CounterEvent.incremented({ amount: 42 })
    expect(event.amount).toBe(42)
    expect(event.type).toBe('Counter/incremented')
  })
})
