import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { DeleteTodoExecutor } from './delete-todo.command'
import { TodoEvent } from '../../events/todo.events'
import { TodoRepositoryMemory } from '../../../data/repositories/todo.repository.memory'
import type { Todo } from '../../entities/todo'

function makeTodo(): Todo {
  return {
    id: 'todo-1',
    title: 'Test',
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

it('removes todo from repo and emits deleted event', async () => {
  const repo = new TodoRepositoryMemory()
  await repo.save(makeTodo())

  const executor = TestExecutor(DeleteTodoExecutor, {
    deps: { todoRepo: repo },
  })

  await executor.run({ id: 'todo-1' })

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.deleted.type)

  const remaining = await repo.findAll()
  expect(remaining).toHaveLength(0)
})
