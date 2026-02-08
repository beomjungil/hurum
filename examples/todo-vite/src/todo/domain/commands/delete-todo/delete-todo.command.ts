import { CommandExecutor } from '@hurum/core'
import { TodoEvent } from '../../events/todo.events'
import type { TodoRepository } from '../../repository/todo.repository'

export const [DeleteTodoCommand, DeleteTodoExecutor] = CommandExecutor<
  { id: string },
  { todoRepo: TodoRepository }
>('DeleteTodo', async (command, { deps, emit, signal }) => {
  const all = await deps.todoRepo.findAll()
  if (signal.aborted) return
  const childIds = all.filter((t) => t.parentId === command.id).map((t) => t.id)
  for (const childId of childIds) {
    await deps.todoRepo.remove(childId)
    if (signal.aborted) return
  }
  await deps.todoRepo.remove(command.id)
  if (signal.aborted) return
  emit(TodoEvent.deleted({ id: command.id }))
})
