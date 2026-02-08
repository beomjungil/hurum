import { describe, it, expect } from 'vitest'
import { EventBuffer } from './event-buffer'

describe('EventBuffer', () => {
  it('stores and retrieves items in order', () => {
    const buf = new EventBuffer<number>(5)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    expect(buf.getAll()).toEqual([1, 2, 3])
    expect(buf.size).toBe(3)
  })

  it('returns empty array when no items', () => {
    const buf = new EventBuffer<number>(5)
    expect(buf.getAll()).toEqual([])
    expect(buf.size).toBe(0)
  })

  it('evicts oldest items when capacity exceeded', () => {
    const buf = new EventBuffer<number>(3)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.push(4) // evicts 1
    expect(buf.getAll()).toEqual([2, 3, 4])
    expect(buf.size).toBe(3)
  })

  it('handles multiple wrap-arounds', () => {
    const buf = new EventBuffer<number>(3)
    for (let i = 1; i <= 10; i++) buf.push(i)
    expect(buf.getAll()).toEqual([8, 9, 10])
  })

  it('clears all items', () => {
    const buf = new EventBuffer<number>(5)
    buf.push(1)
    buf.push(2)
    buf.clear()
    expect(buf.getAll()).toEqual([])
    expect(buf.size).toBe(0)
  })

  it('works correctly after clear and re-fill', () => {
    const buf = new EventBuffer<number>(3)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.clear()
    buf.push(10)
    buf.push(20)
    expect(buf.getAll()).toEqual([10, 20])
  })

  it('handles capacity of 1', () => {
    const buf = new EventBuffer<string>(1)
    buf.push('a')
    expect(buf.getAll()).toEqual(['a'])
    buf.push('b')
    expect(buf.getAll()).toEqual(['b'])
    expect(buf.size).toBe(1)
  })

  it('fills exactly to capacity', () => {
    const buf = new EventBuffer<number>(3)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    expect(buf.getAll()).toEqual([1, 2, 3])
    expect(buf.size).toBe(3)
  })
})
