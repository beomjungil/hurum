import { describe, it, expect, vi } from 'vitest'
import { TestReducer, TestComputed } from '@hurum/core/testing'
import { TodoItemStore } from './todo-item.store'
import { TodoItemEvent } from './events/todo-item.events'

describe('TodoItemStore — TestReducer', () => {
  const reducer = TestReducer(TodoItemStore)

  const baseItem = {
    id: 'todo-1',
    title: 'Buy milk',
    description: '',
    completed: false,
    priority: 'p4' as const,
    labelIds: ['l1', 'l2'],
    projectId: 'proj-1',
    dueDate: '2026-02-10',
    parentId: null,
    createdAt: 1000,
    updatedAt: 1000,
    isOverdue: false,
  }

  describe('toggled', () => {
    it('toggles completed for matching id', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.toggled({ id: 'todo-1', completed: true }))
      expect(next.completed).toBe(true)
      expect(next.updatedAt).toBeGreaterThan(1000)
    })

    it('ignores toggle for non-matching id', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.toggled({ id: 'other', completed: true }))
      expect(next).toBe(baseItem)
    })
  })

  describe('labelRemoved', () => {
    it('removes a label from labelIds', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.labelRemoved({ labelId: 'l1' }))
      expect(next.labelIds).toEqual(['l2'])
    })

    it('no-ops when label not present', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.labelRemoved({ labelId: 'nonexistent' }))
      expect(next.labelIds).toEqual(['l1', 'l2'])
    })
  })

  describe('projectRemoved', () => {
    it('clears projectId when matching', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.projectRemoved({ projectId: 'proj-1' }))
      expect(next.projectId).toBeNull()
    })

    it('preserves projectId when not matching', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.projectRemoved({ projectId: 'other' }))
      expect(next.projectId).toBe('proj-1')
    })
  })

  describe('updated', () => {
    it('updates title for matching id', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.updated({ id: 'todo-1', title: 'New title' }))
      expect(next.title).toBe('New title')
      expect(next.description).toBe('')
    })

    it('updates multiple fields at once', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.updated({
        id: 'todo-1',
        description: 'A description',
        priority: 'p1',
        dueDate: null,
      }))
      expect(next.description).toBe('A description')
      expect(next.priority).toBe('p1')
      expect(next.dueDate).toBeNull()
      expect(next.title).toBe('Buy milk') // unchanged
    })

    it('ignores update for non-matching id', () => {
      const next = reducer.apply(baseItem, TodoItemEvent.updated({ id: 'other', title: 'Nope' }))
      expect(next).toBe(baseItem)
    })
  })
})

describe('TodoItemStore — TestComputed', () => {
  const isOverdue = TestComputed(TodoItemStore, 'isOverdue')

  it('returns false when no dueDate', () => {
    expect(isOverdue.evaluate({ dueDate: null, completed: false })).toBe(false)
  })

  it('returns false when completed even if overdue', () => {
    expect(isOverdue.evaluate({ dueDate: '2020-01-01', completed: true })).toBe(false)
  })

  it('returns true for past dueDate on incomplete item', () => {
    expect(isOverdue.evaluate({ dueDate: '2020-01-01', completed: false })).toBe(true)
  })

  it('returns false for future dueDate', () => {
    // Use a far future date
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01'))
    expect(isOverdue.evaluate({ dueDate: '2030-12-31', completed: false })).toBe(false)
    vi.useRealTimers()
  })
})
