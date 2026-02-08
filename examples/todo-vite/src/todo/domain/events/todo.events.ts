import { Events, Event } from '@hurum/core'
import type { Todo } from '../entities/todo'

export const TodoEvent = Events('Todo', {
  created: Event<{ todo: Todo }>(),
  createFailed: Event<{ error: string }>(),
  deleted: Event<{ id: string }>(),
  validated: Event<{
    title: string
    projectId: string | null
    priority: string
    labelIds: string[]
    dueDate: string | null
    parentId: string | null
  }>(),
  validationFailed: Event<{ error: string }>(),
  allLoaded: Event<{ todos: Todo[] }>(),
  loadFailed: Event<{ error: string }>(),
  searchStarted: Event<{ query: string }>(),
  searchCompleted: Event<{ results: string[]; query: string }>(),
})
