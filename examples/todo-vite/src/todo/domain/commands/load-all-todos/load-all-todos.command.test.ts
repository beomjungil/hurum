import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { LoadAllTodosExecutor } from './load-all-todos.command'
import { TodoEvent } from '../../events/todo.events'
import { TodoRepositoryMemory } from '../../../data/repositories/todo.repository.memory'
import type { Todo } from '../../entities/todo'

function makeTodo(id: string): Todo {
  return {
    id,
    title: 'Task ' + id,
    description: '',
    completed: false,
    priority: 'p4',
    projectId: null,
    parentId: null,
    labelIds: [],
    dueDate: null,
    createdAt: 1000,
    updatedAt: 1000,
  }
}

it('loads todos from repo and emits allLoaded', async () => {
  const repo = new TodoRepositoryMemory()
  await repo.save(makeTodo('1'))
  await repo.save(makeTodo('2'))

  const executor = TestExecutor(LoadAllTodosExecutor, {
    deps: { todoRepo: repo },
  })

  await executor.run({})

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.allLoaded.type)
  expect((executor.emittedEvents[0] as unknown as { todos: unknown[] }).todos).toHaveLength(2)
})

it('emits loadFailed when repo throws', async () => {
  const repo = {
    findAll: () => Promise.reject(new Error('DB error')),
    save: () => Promise.reject(new Error('not impl')),
    remove: () => Promise.reject(new Error('not impl')),
  }

  const executor = TestExecutor(LoadAllTodosExecutor, {
    deps: { todoRepo: repo },
  })

  await executor.run({})

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.loadFailed.type)
  expect((executor.emittedEvents[0] as unknown as { error: string }).error).toBe('DB error')
})
