import { Store, Events, Event, Intents, Intent } from '@hurum/core'
import type { Priority } from '../../todo/domain/entities/todo'

// Events
const PaletteFormEvent = Events('CommandPaletteForm', {
  pagesPushed: Event<{ page: string }>(),
  pagesPopped: Event<Record<string, never>>(),
  pagesReset: Event<Record<string, never>>(),
  inputChanged: Event<{ value: string }>(),
  priorityChanged: Event<{ priority: Priority }>(),
  dueDateChanged: Event<{ dueDate: string }>(),
  projectToggled: Event<{ projectId: string | null }>(),
  labelToggled: Event<{ labelId: string }>(),
  formReset: Event<Record<string, never>>(),
})

// Intents — named as user actions
export const PaletteFormIntents = Intents('CommandPaletteForm', {
  pushPage: Intent(PaletteFormEvent.pagesPushed),
  popPage: Intent(PaletteFormEvent.pagesPopped),
  resetPages: Intent(PaletteFormEvent.pagesReset),
  typeInput: Intent(PaletteFormEvent.inputChanged),
  changePriority: Intent(PaletteFormEvent.priorityChanged),
  changeDueDate: Intent(PaletteFormEvent.dueDateChanged),
  toggleProject: Intent(PaletteFormEvent.projectToggled),
  toggleLabel: Intent(PaletteFormEvent.labelToggled),
  reset: Intent(PaletteFormEvent.formReset),
})

const DEFAULT_STATE = {
  pages: ['home'] as string[],
  inputValue: '',
  taskPriority: 'p4' as Priority,
  taskDueDate: '',
  taskProjectId: null as string | null,
  taskLabelIds: [] as string[],
}

// Store
export const PaletteFormStore = Store({
  state: { ...DEFAULT_STATE },
})
  .on(PaletteFormEvent, {
    pagesPushed: (state, { page }) => ({ ...state, pages: [...state.pages, page], inputValue: '' }),
    pagesPopped: (state) => ({ ...state, pages: state.pages.slice(0, -1) }),
    pagesReset: (state) => ({ ...state, pages: ['home'] }),
    inputChanged: (state, { value }) => ({ ...state, inputValue: value }),
    priorityChanged: (state, { priority }) => ({ ...state, taskPriority: priority }),
    dueDateChanged: (state, { dueDate }) => ({ ...state, taskDueDate: dueDate }),
    projectToggled: (state, { projectId }) => ({ ...state, taskProjectId: projectId }),
    labelToggled: (state, { labelId }) => ({
      ...state,
      taskLabelIds: state.taskLabelIds.includes(labelId)
        ? state.taskLabelIds.filter((id) => id !== labelId)
        : [...state.taskLabelIds, labelId],
    }),
    formReset: () => ({ ...DEFAULT_STATE }),
  })
  .computed({
    currentPage: (state) => state.pages[state.pages.length - 1]!,
  })
  .intents(PaletteFormIntents)
