import { CommandExecutor } from '@hurum/core'
import { TodoEvent } from '../../events/todo.events'
import type { Todo } from '../../entities/todo'

export const [SearchTodosCommand, SearchTodosExecutor] = CommandExecutor<
  { query: string },
  Record<string, never>,
  { items: Todo[] }
>('SearchTodos', async (command, { emit, getState, signal }) => {
  emit(TodoEvent.searchStarted({ query: command.query }))

  // Allow cancellation window
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  if (signal.aborted) return

  const query = command.query.toLowerCase()
  const state = getState()
  const todos = state.items ?? []
  const results = query
    ? todos
        .filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query),
        )
        .map((t) => t.id)
    : []

  emit(TodoEvent.searchCompleted({ results, query: command.query }))
})
