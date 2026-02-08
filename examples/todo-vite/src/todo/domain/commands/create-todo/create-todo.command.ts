import { CommandExecutor } from '@hurum/core'
import { TodoEvent } from '../../events/todo.events'
import type { Todo, Priority } from '../../entities/todo'
import type { TodoRepository } from '../../repository/todo.repository'

export interface CreateTodoInput {
  title: string
  description?: string
  projectId?: string | null
  priority?: Priority
  labelIds?: string[]
  dueDate?: string | null
  parentId?: string | null
}

export const [CreateTodoCommand, CreateTodoExecutor] = CommandExecutor<
  CreateTodoInput,
  { todoRepo: TodoRepository }
>('CreateTodo', async (command, { deps, emit, signal }) => {
  if (signal.aborted) return

  const now = Date.now()
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: command.title.trim(),
    description: command.description ?? '',
    completed: false,
    priority: command.priority ?? 'p4',
    projectId: command.projectId ?? null,
    labelIds: command.labelIds ?? [],
    dueDate: command.dueDate ?? null,
    parentId: command.parentId ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await deps.todoRepo.save(todo)
  if (signal.aborted) return

  emit(TodoEvent.created({ todo }))
})
