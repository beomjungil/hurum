import { Intents, Intent } from '@hurum/core'
import { ValidateTodoCommand } from '../commands/validate-todo/validate-todo.command'
import { CreateTodoCommand } from '../commands/create-todo/create-todo.command'
import { DeleteTodoCommand } from '../commands/delete-todo/delete-todo.command'
import { ToggleLabelCommand } from '../commands/toggle-label/toggle-label.command'
import { SearchTodosCommand } from '../commands/search-todos/search-todos.command'
import { LoadAllTodosCommand } from '../commands/load-all-todos/load-all-todos.command'
import {
  EditTitleCommand,
  EditDescriptionCommand,
  SetPriorityCommand,
  SetDueDateCommand,
  AssignProjectCommand,
} from '../commands/update-todo/update-todo.command'
import { TodoItemEvent } from '../events/todo-item.events'

export const TodoIntents = Intents('Todo', {
  create: Intent(ValidateTodoCommand, CreateTodoCommand),
  delete: Intent(DeleteTodoCommand),
  toggle: Intent(TodoItemEvent.toggled),
  toggleLabel: Intent(ToggleLabelCommand),
  search: Intent(SearchTodosCommand),
  loadAll: Intent(LoadAllTodosCommand),

  // Specific edit intents — each describes a distinct user action
  editTitle: Intent(EditTitleCommand),
  editDescription: Intent(EditDescriptionCommand),
  setPriority: Intent(SetPriorityCommand),
  setDueDate: Intent(SetDueDateCommand),
  assignProject: Intent(AssignProjectCommand),
})
