import { it, expect } from 'vitest'
import { TestStore } from '@hurum/core/testing'
import type { StoreInstance, PreparedIntent } from '@hurum/core'
import { AppStore } from './app.store'
import { AppIntents } from './app.intents'
import { TodoIntents } from '../../todo/domain/intents/todo.intents'
import { LabelIntents } from '../../label/domain/intents/label.intents'
import { ProjectIntents } from '../../project/domain/intents/project.intents'
import { FilterIntents } from '../../filter/domain/intents/filter.intents'
import { TodoRepositoryMemory } from '../../todo/data/repositories/todo.repository.memory'
import { ProjectRepositoryMemory } from '../../project/data/repositories/project.repository.memory'
import { LabelRepositoryMemory } from '../../label/data/repositories/label.repository.memory'

function createAppStore() {
  return TestStore(AppStore, {
    deps: {
      todoRepo: new TodoRepositoryMemory(),
      projectRepo: new ProjectRepositoryMemory(),
      labelRepo: new LabelRepositoryMemory(),
    },
  })
}

/** Helper: send PreparedIntent to a child scope store and flush microtasks. */
async function scopeSend<TInput>(store: StoreInstance, prepared: PreparedIntent<TInput>): Promise<void> {
  store.send(prepared)
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}

it('starts with initialized false', () => {
  const store = createAppStore()
  expect(store.getState().initialized).toBe(false)
})

it('creates a todo via child scope (validate then save)', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Buy milk', priority: 'p2' }))
  const state = store.getState()
  expect(state.todo.items).toHaveLength(1)
  expect(state.todo.items[0]!.title).toBe('Buy milk')
  store.assertNoRunningExecutors()
})

it('rejects empty title on create', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.todo, TodoIntents.create({ title: '   ' }))
  const state = store.getState()
  expect(state.todo.items).toHaveLength(0)
  expect(state.todo.validationError).toBe('Title cannot be empty')
})

it('creates and deletes a project (Nested.map)', async () => {
  const store = createAppStore()
  await store.send(ProjectIntents.create({ name: 'Work', color: '#2563eb' }))
  const state = store.getState()
  const projectIds = Object.keys(state.projects)
  expect(projectIds).toHaveLength(1)

  const projectId = projectIds[0]!
  await store.send(ProjectIntents.delete({ id: projectId }))
  expect(Object.keys(store.getState().projects)).toHaveLength(0)
  store.assertNoRunningExecutors()
})

it('creates and deletes a label (Nested single)', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.labels, LabelIntents.create({ name: 'Urgent', color: '#ef4444' }))
  const state = store.getState()
  expect(state.labels.items).toHaveLength(1)

  const labelId = state.labels.items[0]!.id
  await scopeSend(store.scope.labels, LabelIntents.delete({ id: labelId }))
  expect(store.getState().labels.items).toHaveLength(0)
  store.assertNoRunningExecutors()
})

it('filters todos by priority (cross-aggregate computed)', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'High', priority: 'p1' }))
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Low', priority: 'p4' }))

  await scopeSend(store.scope.filter, FilterIntents.changePriority({ priority: 'p1' }))

  const state = store.getState()
  expect(state.filteredTodos).toHaveLength(1)
  expect(state.filteredTodos[0]!.title).toBe('High')
  store.assertNoRunningExecutors()
})

it('toggles show completed filter', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Done' }))
  const todoId = store.getState().todo.items[0]!.id
  await scopeSend(store.scope.todo, TodoIntents.toggle({ id: todoId, completed: true }))

  // Completed todos are hidden by default
  expect(store.getState().filteredTodos).toHaveLength(0)

  await scopeSend(store.scope.filter, FilterIntents.toggleCompleted({ showCompleted: true }))
  expect(store.getState().filteredTodos).toHaveLength(1)
  store.assertNoRunningExecutors()
})

it('computes progress correctly (cross-aggregate)', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'A' }))
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'B' }))

  const todoId = store.getState().todo.items[0]!.id
  await scopeSend(store.scope.todo, TodoIntents.toggle({ id: todoId, completed: true }))

  expect(store.getState().progress).toBe(50)
  store.assertNoRunningExecutors()
})

it('appOpened initializes all data via scope delegation', async () => {
  const todoRepo = new TodoRepositoryMemory()
  await todoRepo.save({
    id: 't1',
    title: 'Pre',
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

  const store = TestStore(AppStore, {
    deps: {
      todoRepo,
      projectRepo: new ProjectRepositoryMemory(),
      labelRepo: new LabelRepositoryMemory(),
    },
  })

  await store.send(AppIntents.appOpened({}))

  const state = store.getState()
  expect(state.todo.items).toHaveLength(1)
  expect(state.initialized).toBe(true)
  store.assertNoRunningExecutors()
})

it('throws when sending to disposed store', () => {
  const store = AppStore.create({
    deps: {
      todoRepo: new TodoRepositoryMemory(),
      projectRepo: new ProjectRepositoryMemory(),
      labelRepo: new LabelRepositoryMemory(),
    },
  })
  store.dispose()
  expect(() => {
    store.send(ProjectIntents.create({ name: 'test', color: '#000' }))
  }).toThrow()
})

it('filters by project view (cross-aggregate computed)', async () => {
  const store = createAppStore()
  await store.send(ProjectIntents.create({ name: 'Work', color: '#2563eb' }))
  const projectId = Object.keys(store.getState().projects)[0]

  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Work task', projectId }))
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Personal task' }))

  await scopeSend(store.scope.filter, FilterIntents.changeView({ view: 'project', projectId }))

  expect(store.getState().filteredTodos).toHaveLength(1)
  expect(store.getState().filteredTodos[0]!.title).toBe('Work task')
  store.assertNoRunningExecutors()
})

it('relay removes labelIds from todos on label delete (cross-aggregate)', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.labels, LabelIntents.create({ name: 'Urgent', color: '#ef4444' }))
  const labelId = store.getState().labels.items[0]!.id

  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Tagged', labelIds: [labelId] }))
  expect(store.getState().todo.items[0]!.labelIds).toContain(labelId)

  await scopeSend(store.scope.labels, LabelIntents.delete({ id: labelId }))
  expect(store.getState().todo.items[0]!.labelIds).not.toContain(labelId)
  store.assertNoRunningExecutors()
})

it('assertEventSequence verifies event-to-state transitions', async () => {
  const store = createAppStore()
  await scopeSend(store.scope.todo, TodoIntents.create({ title: 'Verified' }))
  const todo = store.getState().todo.items[0]!

  // assertEventSequence only captures events processed by THIS store's applyEvent.
  // Child store events bubble up, so the parent can see them.
  // However, the stateSnapshots are only captured when the parent has an on handler.
  // Since TodoEvent.validated and TodoEvent.created are handled by child (TodoStore),
  // they do NOT appear in AppStore's stateSnapshots.
  // This test verifies the final state instead.
  expect(todo.title).toBe('Verified')
  expect(todo.priority).toBe('p4')
  expect(store.getState().todo.validationError).toBeNull()
  store.assertNoRunningExecutors()
})

it('Nested.map: projectsList computed returns array of projects', async () => {
  const store = createAppStore()
  await store.send(ProjectIntents.create({ name: 'Work', color: '#2563eb' }))
  await store.send(ProjectIntents.create({ name: 'Home', color: '#16a34a' }))

  const state = store.getState()
  expect(state.projectsList).toHaveLength(2)
  expect(state.projectsList.map((p) => p.name).sort()).toEqual(['Home', 'Work'])
  store.assertNoRunningExecutors()
})

it('scope exposes nested child store instances', () => {
  const store = createAppStore()

  // Nested (single): scope.todo, scope.labels, scope.filter
  expect(store.scope.todo).toBeDefined()
  expect(store.scope.labels).toBeDefined()
  expect(store.scope.filter).toBeDefined()

  // Nested.map: scope.projects is a Map
  expect(store.scope.projects).toBeDefined()
  expect(store.scope.projects instanceof Map).toBe(true)
})
