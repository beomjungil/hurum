import { describe, it, expect } from 'vitest'
import { TestReducer, TestComputed, TestIntent } from '@hurum/core/testing'
import { TodoStore } from './todo.store'
import { TodoEvent } from './events/todo.events'
import { TodoIntents } from './intents/todo.intents'
import type { Todo } from './entities/todo'

type ResolvedTodo = Todo & { isOverdue: boolean }

const makeTodo = (overrides: Partial<ResolvedTodo> = {}): ResolvedTodo => ({
  id: 'todo-1',
  title: 'Test',
  description: '',
  completed: false,
  priority: 'p4',
  labelIds: [],
  projectId: null,
  dueDate: null,
  parentId: null,
  createdAt: 1000,
  updatedAt: 1000,
  isOverdue: false,
  ...overrides,
})

describe('TodoStore — TestReducer', () => {
  const reducer = TestReducer(TodoStore)

  const emptyState = {
    items: [] as ResolvedTodo[],
    searchQuery: '',
    searchResults: null as string[] | null,
    searching: false,
    validationError: null as string | null,
  }

  it('created adds todo and clears validationError', () => {
    const stateWithError = { ...emptyState, validationError: 'Title cannot be empty' }
    const todo = makeTodo()
    const next = reducer.apply(stateWithError, TodoEvent.created({ todo }))
    expect(next.items).toHaveLength(1)
    expect(next.items[0]).toBe(todo)
    expect(next.validationError).toBeNull()
  })

  it('deleted removes todo and its subtasks', () => {
    const parent = makeTodo({ id: 'parent' })
    const child = makeTodo({ id: 'child', parentId: 'parent' })
    const other = makeTodo({ id: 'other' })
    const state = { ...emptyState, items: [parent, child, other] }
    const next = reducer.apply(state, TodoEvent.deleted({ id: 'parent' }))
    expect(next.items).toHaveLength(1)
    expect(next.items[0]!.id).toBe('other')
  })

  it('validated clears validationError', () => {
    const state = { ...emptyState, validationError: 'Some error' }
    const next = reducer.apply(state, TodoEvent.validated({
      title: 'T', projectId: null, priority: 'p4', labelIds: [], dueDate: null, parentId: null,
    }))
    expect(next.validationError).toBeNull()
  })

  it('validationFailed sets error', () => {
    const next = reducer.apply(emptyState, TodoEvent.validationFailed({ error: 'Title too long' }))
    expect(next.validationError).toBe('Title too long')
  })

  it('allLoaded replaces items', () => {
    const todos = [makeTodo({ id: 'a' }), makeTodo({ id: 'b' })]
    const next = reducer.apply(emptyState, TodoEvent.allLoaded({ todos }))
    expect(next.items).toHaveLength(2)
  })

  it('searchStarted sets query and searching flag', () => {
    const next = reducer.apply(emptyState, TodoEvent.searchStarted({ query: 'milk' }))
    expect(next.searchQuery).toBe('milk')
    expect(next.searching).toBe(true)
  })

  it('searchCompleted stores results and clears searching', () => {
    const state = { ...emptyState, searching: true }
    const next = reducer.apply(state, TodoEvent.searchCompleted({ results: ['id1'], query: 'milk' }))
    expect(next.searchResults).toEqual(['id1'])
    expect(next.searching).toBe(false)
  })

  it('searchCompleted with empty query clears results', () => {
    const state = { ...emptyState, searching: true, searchResults: ['id1'] }
    const next = reducer.apply(state, TodoEvent.searchCompleted({ results: [], query: '' }))
    expect(next.searchResults).toBeNull()
  })
})

describe('TodoStore — TestComputed', () => {
  const activeTodos = TestComputed(TodoStore, 'activeTodos')
  const completedTodos = TestComputed(TodoStore, 'completedTodos')

  const items = [
    makeTodo({ id: '1', completed: false }),
    makeTodo({ id: '2', completed: true }),
    makeTodo({ id: '3', completed: false, parentId: '1' }), // subtask — excluded
  ]

  it('activeTodos returns incomplete root items only', () => {
    const result = activeTodos.evaluate({ items })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('1')
  })

  it('completedTodos returns completed root items only', () => {
    const result = completedTodos.evaluate({ items })
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('2')
  })

  it('returns empty arrays for empty items', () => {
    expect(activeTodos.evaluate({ items: [] })).toHaveLength(0)
    expect(completedTodos.evaluate({ items: [] })).toHaveLength(0)
  })
})

describe('TodoIntents — TestIntent', () => {
  it('create is sequential with 2 commands (validate → create)', () => {
    const intent = TestIntent(TodoIntents.create)
    expect(intent.steps).toHaveLength(2)
    expect(intent.mode).toBe('sequential')
    expect(intent.steps[0]!.name).toBe('ValidateTodo')
    expect(intent.steps[1]!.name).toBe('CreateTodo')
  })

  it('delete has single command', () => {
    const intent = TestIntent(TodoIntents.delete)
    expect(intent.steps).toHaveLength(1)
  })

  it('toggleLabel has single command', () => {
    const intent = TestIntent(TodoIntents.toggleLabel)
    expect(intent.steps).toHaveLength(1)
  })

  it('edit intents each have single command', () => {
    for (const key of ['editTitle', 'editDescription', 'setPriority', 'setDueDate', 'assignProject'] as const) {
      const intent = TestIntent(TodoIntents[key])
      expect(intent.steps).toHaveLength(1)
      expect(intent.mode).toBe('sequential')
    }
  })
})
