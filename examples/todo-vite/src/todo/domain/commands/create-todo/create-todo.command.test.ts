import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { CreateTodoExecutor } from './create-todo.command'
import { TodoEvent } from '../../events/todo.events'
import { TodoRepositoryMemory } from '../../../data/repositories/todo.repository.memory'

it('saves todo to repo and emits created event', async () => {
  const repo = new TodoRepositoryMemory()
  const executor = TestExecutor(CreateTodoExecutor, {
    deps: { todoRepo: repo },
  })

  await executor.run({ title: 'Buy milk', priority: 'p2', labelIds: [], projectId: null })

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.created.type)

  const saved = await repo.findAll()
  expect(saved).toHaveLength(1)
  expect(saved[0]!.title).toBe('Buy milk')
  expect(saved[0]!.priority).toBe('p2')
})

it('uses default priority p4', async () => {
  const repo = new TodoRepositoryMemory()
  const executor = TestExecutor(CreateTodoExecutor, {
    deps: { todoRepo: repo },
  })

  await executor.run({ title: 'Task' })

  const saved = await repo.findAll()
  expect(saved[0]!.priority).toBe('p4')
})

it('does not emit when aborted', async () => {
  const repo = new TodoRepositoryMemory()
  const executor = TestExecutor(CreateTodoExecutor, {
    deps: { todoRepo: repo },
  })

  executor.abort()
  await executor.run({ title: 'Aborted task' })

  expect(executor.emittedEvents).toHaveLength(0)
})
