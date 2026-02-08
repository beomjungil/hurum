import { Events, Event } from '@hurum/core'
import type { Priority } from '../entities/todo'

export const TodoItemEvent = Events('TodoItem', {
  toggled: Event<{ id: string; completed: boolean }>(),
  labelRemoved: Event<{ labelId: string }>(),
  projectRemoved: Event<{ projectId: string }>(),
  updated: Event<{
    id: string
    title?: string
    description?: string
    priority?: Priority
    projectId?: string | null
    labelIds?: string[]
    dueDate?: string | null
  }>(),
})
