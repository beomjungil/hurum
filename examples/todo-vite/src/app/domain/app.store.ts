import { Store, Nested } from '@hurum/core'
import { logger, persist } from '@hurum/core'
import { createDevtools } from '@hurum/devtools'
import { AppEvent } from './app.events'
import { AppIntents } from './app.intents'

// Nested child stores
import { TodoStore } from '../../todo/domain/todo.store'
import { ProjectStore } from '../../project/domain/project.store'
import { LabelStore } from '../../label/domain/label.store'
import { FilterStore } from '../../filter/domain/filter.store'
import { CommandPaletteStore } from '../../command-palette/domain/command-palette.store'

// Events (for on handlers and relay)
import { ProjectEvent } from '../../project/domain/events/project.events'
import { LabelEvent } from '../../label/domain/events/label.events'
import { TodoItemEvent } from '../../todo/domain/events/todo-item.events'

// App executors
import { InitializeAppExecutor } from './commands/initialize-app/initialize-app.command'

// Project executors (AppStore manages project Nested.map collection)
import { CreateProjectExecutor } from '../../project/domain/commands/create-project/create-project.command'
import { DeleteProjectExecutor } from '../../project/domain/commands/delete-project/delete-project.command'

// Types
import type { TodoRepository } from '../../todo/domain/repository/todo.repository'
import type { ProjectRepository } from '../../project/domain/repository/project.repository'
import type { LabelRepository } from '../../label/domain/repository/label.repository'

const persistHandle = persist({
  key: 'todo-app-filter',
  pick: ['filter'],
})

export const devtoolsHandle = createDevtools({ name: 'Todo App' })

export const AppStore = Store({
  state: {
    // Nested children — each aggregate is a separate Store
    todo: Nested(TodoStore),
    projects: Nested.map(ProjectStore),
    labels: Nested(LabelStore),
    filter: Nested(FilterStore),
    commandPalette: Nested(CommandPaletteStore),

    // App's own state
    initialized: false,
  },
})
  // App's own event
  .on(AppEvent.initialized, (state) => ({
    ...state,
    initialized: true,
  }))
  // Project collection management (Nested.map state-driven diffing)
  .on(ProjectEvent.created, (state, { project }) => ({
    ...state,
    projects: {
      ...state.projects,
      [project.id]: project,
    },
  }))
  .on(ProjectEvent.deleted, (state, { id }) => ({
    ...state,
    projects: Object.fromEntries(
      Object.entries(state.projects).filter(([k]) => k !== id),
    ),
  }))
  .on(ProjectEvent.allLoaded, (state, { projects }) => ({
    ...state,
    projects: Object.fromEntries(projects.map((p) => [p.id, p])),
  }))
  // Cross-aggregate relay: deleting a label removes it from all todo items
  .relay(LabelEvent.deleted, (_event, _state) => {
    return [TodoItemEvent.labelRemoved({ labelId: _event.id })]
  })
  // Cross-aggregate relay: deleting a project clears projectId from all todo items
  .relay(ProjectEvent.deleted, (_event, _state) => {
    return [TodoItemEvent.projectRemoved({ projectId: _event.id })]
  })
  .computed({
    // Cross-aggregate computed: reads nested child states
    todayTodos: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.todo.items.filter((t) => !t.parentId && t.dueDate === today && !t.completed)
    },
    totalCount: (state) => state.todo.items.filter((t) => !t.parentId).length,
    completedCount: (state) =>
      state.todo.items.filter((t) => !t.parentId && t.completed).length,
    progress: (state) => {
      const roots = state.todo.items.filter((t) => !t.parentId)
      if (roots.length === 0) return 0
      return Math.round(roots.filter((t) => t.completed).length / roots.length * 100)
    },
    filteredTodos: (state) => {
      const { items } = state.todo
      const filter = state.filter
      let result = items.filter((t) => !t.parentId)

      if (filter.view === 'today') {
        const today = new Date().toISOString().split('T')[0]
        result = result.filter((t) => t.dueDate === today)
      } else if (filter.view === 'project' && filter.selectedProjectId) {
        result = result.filter((t) => t.projectId === filter.selectedProjectId)
      } else if (filter.view === 'label' && filter.selectedLabelId) {
        result = result.filter((t) => t.labelIds.includes(filter.selectedLabelId as string))
      }

      if (!filter.showCompleted) {
        result = result.filter((t) => !t.completed)
      }

      if (filter.priorityFilter) {
        result = result.filter((t) => t.priority === filter.priorityFilter)
      }

      return result
    },
    projectsList: (state) => {
      return Object.values(state.projects)
    },
    // Subtask counts for TodoItem indicators (avoids per-item full items subscription)
    subtaskCounts: (state) => {
      const counts: Record<string, { done: number; total: number }> = {}
      for (const t of state.todo.items) {
        if (!t.parentId) continue
        const entry = counts[t.parentId] ?? (counts[t.parentId] = { done: 0, total: 0 })
        entry.total++
        if (t.completed) entry.done++
      }
      return counts
    },
  })
  .intents(AppIntents)
  .executors(
    // App initialization (delegates to children via scope)
    InitializeAppExecutor,
    // Project executors (AppStore manages project Nested.map collection)
    CreateProjectExecutor,
    DeleteProjectExecutor,
  )
  .deps<{ todoRepo: TodoRepository; projectRepo: ProjectRepository; labelRepo: LabelRepository }>()
  .childDeps('todo', (deps) => ({ todoRepo: deps.todoRepo }))
  .childDeps('labels', (deps) => ({ labelRepo: deps.labelRepo }))
  .middleware(devtoolsHandle.middleware, logger(), persistHandle.middleware)

export function getPersistedAppState() {
  return persistHandle.getPersistedState()
}
