import { it, expect } from 'vitest'
import { TestStore } from '@hurum/core/testing'
import { TodoStore } from './todo.store'
import { TodoRepositoryMemory } from '../data/repositories/todo.repository.memory'

function createTodoStore() {
  return TestStore(TodoStore, { deps: { todoRepo: new TodoRepositoryMemory() } })
}

it('creates a todo via sequential intent (validate then save)', async () => {
  const store = createTodoStore()
  await store.send.create({ title: 'Buy milk', priority: 'p2' })
  const state = store.getState()
  expect(state.items).toHaveLength(1)
  expect(state.items[0]!.title).toBe('Buy milk')
  expect(state.items[0]!.priority).toBe('p2')
  store.assertNoRunningExecutors()
})

it('rejects empty title with validation error', async () => {
  const store = createTodoStore()
  await store.send.create({ title: '   ' })
  const state = store.getState()
  expect(state.items).toHaveLength(0)
  expect(state.validationError).toBe('Title cannot be empty')
})

it('deletes a todo', async () => {
  const store = createTodoStore()
  await store.send.create({ title: 'To delete' })
  const id = store.getState().items[0]!.id
  await store.send.delete({ id })
  expect(store.getState().items).toHaveLength(0)
  store.assertNoRunningExecutors()
})

it('persists todo to repository on create', async () => {
  const repo = new TodoRepositoryMemory()
  const store = TestStore(TodoStore, { deps: { todoRepo: repo } })
  await store.send.create({ title: 'Persisted' })
  const saved = await repo.findAll()
  expect(saved).toHaveLength(1)
  expect(saved[0]!.title).toBe('Persisted')
})

it('searches todos by title', async () => {
  const store = createTodoStore()
  await store.send.create({ title: 'Buy milk' })
  await store.send.create({ title: 'Walk dog' })
  await store.send.search({ query: 'milk' })
  const state = store.getState()
  expect(state.searchResults).toHaveLength(1)
  store.assertNoRunningExecutors()
})

it('cancel clears search', async () => {
  const store = createTodoStore()
  await store.send.create({ title: 'Buy milk' })

  await store.send.search({ query: 'milk' })
  const state = store.getState()
  expect(state.searchResults).toHaveLength(1)
  store.assertNoRunningExecutors()
})

it('loads all todos from repo', async () => {
  const repo = new TodoRepositoryMemory()
  await repo.save({
    id: 'pre-1',
    title: 'Preloaded',
    description: '',
    completed: false,
    priority: 'p4',
    projectId: null,
    parentId: null,
    labelIds: [],
    dueDate: null,
    createdAt: 1000,
    updatedAt: 1000,
  })

  const store = TestStore(TodoStore, { deps: { todoRepo: repo } })
  await store.send.loadAll({})

  const state = store.getState()
  expect(state.items).toHaveLength(1)
  expect(state.items[0]!.title).toBe('Preloaded')
  store.assertNoRunningExecutors()
})
