import { Store } from '@hurum/core'
import type { Priority } from './entities/todo'
import { TodoItemEvent } from './events/todo-item.events'

export const TodoItemStore = Store({
  state: {
    id: '' as string,
    title: '' as string,
    description: '' as string,
    completed: false,
    priority: 'p4' as Priority,
    labelIds: [] as string[],
    projectId: null as string | null,
    dueDate: null as string | null,
    parentId: null as string | null,
    createdAt: 0,
    updatedAt: 0,
  },
})
  .on(TodoItemEvent, {
    toggled: (state, { id, completed }) => {
      if (state.id !== id) return state
      return { ...state, completed, updatedAt: Date.now() }
    },

    labelRemoved: (state, { labelId }) => ({
      ...state,
      labelIds: state.labelIds.filter((lid) => lid !== labelId),
    }),

    projectRemoved: (state, { projectId }) => ({
      ...state,
      projectId: state.projectId === projectId ? null : state.projectId,
    }),

    updated: (state, payload) => {
      if (state.id !== payload.id) return state
      return {
        ...state,
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.priority !== undefined && { priority: payload.priority }),
        ...(payload.projectId !== undefined && { projectId: payload.projectId }),
        ...(payload.labelIds !== undefined && { labelIds: payload.labelIds }),
        ...(payload.dueDate !== undefined && { dueDate: payload.dueDate }),
        updatedAt: Date.now(),
      }
    },
  })
  .computed({
    isOverdue: (state) =>
      state.dueDate ? new Date(state.dueDate) < new Date() && !state.completed : false,
  })
