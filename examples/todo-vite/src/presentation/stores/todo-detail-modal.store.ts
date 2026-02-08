import { Store, Events, Event, Intents, Intent } from '@hurum/core'

// Events
const TodoDetailModalEvent = Events('TodoDetailModal', {
  opened: Event<{ todoId: string }>(),
  closed: Event<Record<string, never>>(),
})

// Intents
export const TodoDetailModalIntents = Intents('TodoDetailModal', {
  open: Intent(TodoDetailModalEvent.opened),
  close: Intent(TodoDetailModalEvent.closed),
})

// Store
export const TodoDetailModalStore = Store({
  state: {
    openTodoId: null as string | null,
  },
})
  .on(TodoDetailModalEvent, {
    opened: (_state, { todoId }) => ({
      openTodoId: todoId,
    }),
    closed: () => ({
      openTodoId: null,
    }),
  })
  .intents(TodoDetailModalIntents)
