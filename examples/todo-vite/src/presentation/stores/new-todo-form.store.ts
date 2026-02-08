import { Store, Events, Event, Intents, Intent } from '@hurum/core'
import type { Priority } from '../../todo/domain/entities/todo'

// Events
const NewTodoFormEvent = Events('NewTodoForm', {
  titleChanged: Event<{ title: string }>(),
  priorityChanged: Event<{ priority: Priority }>(),
  dueDateChanged: Event<{ dueDate: string }>(),
  projectIdChanged: Event<{ projectId: string | null }>(),
  labelIdsChanged: Event<{ labelIds: string[] }>(),
  reset: Event<Record<string, never>>(),
})

// Intents
export const NewTodoFormIntents = Intents('NewTodoForm', {
  setTitle: Intent(NewTodoFormEvent.titleChanged),
  setPriority: Intent(NewTodoFormEvent.priorityChanged),
  setDueDate: Intent(NewTodoFormEvent.dueDateChanged),
  setProjectId: Intent(NewTodoFormEvent.projectIdChanged),
  setLabelIds: Intent(NewTodoFormEvent.labelIdsChanged),
  reset: Intent(NewTodoFormEvent.reset),
})

// Store
export const NewTodoFormStore = Store({
  state: {
    title: '',
    priority: 'p4' as Priority,
    dueDate: '',
    projectId: null as string | null,
    labelIds: [] as string[],
  },
})
  .on(NewTodoFormEvent, {
    titleChanged: (state, { title }) => ({ ...state, title }),
    priorityChanged: (state, { priority }) => ({ ...state, priority }),
    dueDateChanged: (state, { dueDate }) => ({ ...state, dueDate }),
    projectIdChanged: (state, { projectId }) => ({ ...state, projectId }),
    labelIdsChanged: (state, { labelIds }) => ({ ...state, labelIds }),
    reset: () => ({ title: '', priority: 'p4' as Priority, dueDate: '', projectId: null, labelIds: [] }),
  })
  .intents(NewTodoFormIntents)
