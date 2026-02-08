import { Store, Nested } from '@hurum/core'
import { TodoItemStore } from './todo-item.store'
import { TodoEvent } from './events/todo.events'
import { TodoIntents } from './intents/todo.intents'
import { ValidateTodoExecutor } from './commands/validate-todo/validate-todo.command'
import { CreateTodoExecutor } from './commands/create-todo/create-todo.command'
import { DeleteTodoExecutor } from './commands/delete-todo/delete-todo.command'
import { SearchTodosExecutor } from './commands/search-todos/search-todos.command'
import { LoadAllTodosExecutor } from './commands/load-all-todos/load-all-todos.command'
import {
  EditTitleExecutor,
  EditDescriptionExecutor,
  SetPriorityExecutor,
  SetDueDateExecutor,
  AssignProjectExecutor,
} from './commands/update-todo/update-todo.command'
import { ToggleLabelExecutor } from './commands/toggle-label/toggle-label.command'
import type { TodoRepository } from './repository/todo.repository'

export const TodoStore = Store({
  state: {
    items: Nested.array(TodoItemStore),
    searchQuery: '',
    searchResults: null as string[] | null,
    searching: false,
    validationError: null as string | null,
  },
})
  .on(TodoEvent, {
    created: (state, { todo }) => ({
      ...state,
      items: [...state.items, todo],
      validationError: null,
    }),

    deleted: (state, { id }) => ({
      ...state,
      items: state.items.filter((t) => t.id !== id && t.parentId !== id),
    }),

    validated: (state) => ({
      ...state,
      validationError: null,
    }),

    validationFailed: (state, { error }) => ({
      ...state,
      validationError: error,
    }),

    allLoaded: (state, { todos }) => ({
      ...state,
      items: todos,
    }),

    searchStarted: (state, { query }) => ({
      ...state,
      searchQuery: query,
      searching: true,
    }),

    searchCompleted: (state, { results, query }) => ({
      ...state,
      searchResults: query ? results : null,
      searching: false,
    }),
  })
  .computed({
    activeTodos: (state) => state.items.filter((t) => !t.parentId && !t.completed),
    completedTodos: (state) => state.items.filter((t) => !t.parentId && t.completed),
  })
  .intents(TodoIntents)
  .executors(
    ValidateTodoExecutor,
    CreateTodoExecutor,
    DeleteTodoExecutor,
    SearchTodosExecutor,
    LoadAllTodosExecutor,
    EditTitleExecutor,
    EditDescriptionExecutor,
    SetPriorityExecutor,
    SetDueDateExecutor,
    AssignProjectExecutor,
    ToggleLabelExecutor,
  )
  .deps<{ todoRepo: TodoRepository }>()
