import { CommandExecutor } from '@hurum/core'
import { TodoItemEvent } from '../../events/todo-item.events'
import type { Priority } from '../../entities/todo'
import type { TodoRepository } from '../../repository/todo.repository'

export const [EditTitleCommand, EditTitleExecutor] = CommandExecutor<
  { id: string; title: string },
  { todoRepo: TodoRepository }
>('EditTodoTitle', async (command, { deps, emit, signal }) => {
  const updated = await deps.todoRepo.update(command.id, { title: command.title })
  if (signal.aborted) return
  emit(TodoItemEvent.updated({ id: updated.id, title: updated.title }))
})

export const [EditDescriptionCommand, EditDescriptionExecutor] = CommandExecutor<
  { id: string; description: string },
  { todoRepo: TodoRepository }
>('EditTodoDescription', async (command, { deps, emit, signal }) => {
  const updated = await deps.todoRepo.update(command.id, { description: command.description })
  if (signal.aborted) return
  emit(TodoItemEvent.updated({ id: updated.id, description: updated.description }))
})

export const [SetPriorityCommand, SetPriorityExecutor] = CommandExecutor<
  { id: string; priority: Priority },
  { todoRepo: TodoRepository }
>('SetTodoPriority', async (command, { deps, emit, signal }) => {
  const updated = await deps.todoRepo.update(command.id, { priority: command.priority })
  if (signal.aborted) return
  emit(TodoItemEvent.updated({ id: updated.id, priority: updated.priority }))
})

export const [SetDueDateCommand, SetDueDateExecutor] = CommandExecutor<
  { id: string; dueDate: string | null },
  { todoRepo: TodoRepository }
>('SetTodoDueDate', async (command, { deps, emit, signal }) => {
  const updated = await deps.todoRepo.update(command.id, { dueDate: command.dueDate })
  if (signal.aborted) return
  emit(TodoItemEvent.updated({ id: updated.id, dueDate: updated.dueDate }))
})

export const [AssignProjectCommand, AssignProjectExecutor] = CommandExecutor<
  { id: string; projectId: string | null },
  { todoRepo: TodoRepository }
>('AssignTodoProject', async (command, { deps, emit, signal }) => {
  const updated = await deps.todoRepo.update(command.id, { projectId: command.projectId })
  if (signal.aborted) return
  emit(TodoItemEvent.updated({ id: updated.id, projectId: updated.projectId }))
})
