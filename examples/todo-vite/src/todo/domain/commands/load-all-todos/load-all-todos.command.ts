import { CommandExecutor } from '@hurum/core'
import { TodoEvent } from '../../events/todo.events'
import type { TodoRepository } from '../../repository/todo.repository'

export const [LoadAllTodosCommand, LoadAllTodosExecutor] = CommandExecutor<
  {},
  { todoRepo: TodoRepository }
>('LoadAllTodos', async (_command, { deps, emit, signal }) => {
  try {
    const todos = await deps.todoRepo.findAll()
    if (signal.aborted) return
    emit(TodoEvent.allLoaded({ todos }))
  } catch (e) {
    if (signal.aborted) return
    emit(TodoEvent.loadFailed({ error: e instanceof Error ? e.message : String(e) }))
  }
})
