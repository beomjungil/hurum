import { CommandExecutor } from '@hurum/core'
import { TodoEvent } from '../../events/todo.events'
import type { Priority } from '../../entities/todo'

export interface ValidateTodoInput {
  title: string
  projectId?: string | null
  priority?: Priority
  labelIds?: string[]
  dueDate?: string | null
  parentId?: string | null
}

export const [ValidateTodoCommand, ValidateTodoExecutor] = CommandExecutor<
  ValidateTodoInput
>('ValidateTodo', (command, { emit }) => {
  if (!command.title.trim()) {
    emit(TodoEvent.validationFailed({ error: 'Title cannot be empty' }))
    throw new Error('Validation failed')
  }
  emit(TodoEvent.validated({
    title: command.title.trim(),
    projectId: command.projectId ?? null,
    priority: command.priority ?? 'p4',
    labelIds: command.labelIds ?? [],
    dueDate: command.dueDate ?? null,
    parentId: command.parentId ?? null,
  }))
})
