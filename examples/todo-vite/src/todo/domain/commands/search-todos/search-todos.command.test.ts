import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { SearchTodosExecutor } from './search-todos.command'
import { TodoEvent } from '../../events/todo.events'
import type { Todo } from '../../entities/todo'

function makeTodo(id: string, title: string): Todo {
  return {
    id,
    title,
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

it('emits searchStarted then searchCompleted with matching ids', async () => {
  const items = [makeTodo('1', 'Buy milk'), makeTodo('2', 'Walk dog')]
  const executor = TestExecutor(SearchTodosExecutor, {
    state: { items },
  })

  await executor.run({ query: 'milk' })

  expect(executor.emittedEvents).toHaveLength(2)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.searchStarted.type)
  expect(executor.emittedEvents[1]!.type).toBe(TodoEvent.searchCompleted.type)
  expect((executor.emittedEvents[1] as unknown as { results: string[] }).results).toEqual(['1'])
})

it('returns empty results for empty query', async () => {
  const executor = TestExecutor(SearchTodosExecutor, {
    state: { items: [makeTodo('1', 'Task')] },
  })

  await executor.run({ query: '' })

  expect((executor.emittedEvents[1] as unknown as { results: string[] }).results).toEqual([])
})
