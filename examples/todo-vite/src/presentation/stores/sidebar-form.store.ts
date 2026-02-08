import { Store, Events, Event, Intents, Intent } from '@hurum/core'

const PROJECT_DEFAULT_COLOR = '#dc2626'
const LABEL_DEFAULT_COLOR = '#ef4444'

// Events
const SidebarFormEvent = Events('SidebarForm', {
  projectDialogOpened: Event<Record<string, never>>(),
  projectDialogClosed: Event<Record<string, never>>(),
  projectNameChanged: Event<{ name: string }>(),
  projectColorChanged: Event<{ color: string }>(),
  projectFormReset: Event<Record<string, never>>(),

  labelDialogOpened: Event<Record<string, never>>(),
  labelDialogClosed: Event<Record<string, never>>(),
  labelNameChanged: Event<{ name: string }>(),
  labelColorChanged: Event<{ color: string }>(),
  labelFormReset: Event<Record<string, never>>(),
})

// Intents
export const SidebarFormIntents = Intents('SidebarForm', {
  openProjectDialog: Intent(SidebarFormEvent.projectDialogOpened),
  closeProjectDialog: Intent(SidebarFormEvent.projectDialogClosed),
  setProjectName: Intent(SidebarFormEvent.projectNameChanged),
  setProjectColor: Intent(SidebarFormEvent.projectColorChanged),
  resetProjectForm: Intent(SidebarFormEvent.projectFormReset),

  openLabelDialog: Intent(SidebarFormEvent.labelDialogOpened),
  closeLabelDialog: Intent(SidebarFormEvent.labelDialogClosed),
  setLabelName: Intent(SidebarFormEvent.labelNameChanged),
  setLabelColor: Intent(SidebarFormEvent.labelColorChanged),
  resetLabelForm: Intent(SidebarFormEvent.labelFormReset),
})

// Store
export const SidebarFormStore = Store({
  state: {
    showNewProject: false,
    showNewLabel: false,
    newProjectName: '',
    newProjectColor: PROJECT_DEFAULT_COLOR,
    newLabelName: '',
    newLabelColor: LABEL_DEFAULT_COLOR,
  },
})
  .on(SidebarFormEvent, {
    projectDialogOpened: (state) => ({ ...state, showNewProject: true }),
    projectDialogClosed: (state) => ({ ...state, showNewProject: false }),
    projectNameChanged: (state, { name }) => ({ ...state, newProjectName: name }),
    projectColorChanged: (state, { color }) => ({ ...state, newProjectColor: color }),
    projectFormReset: (state) => ({
      ...state,
      showNewProject: false,
      newProjectName: '',
      newProjectColor: PROJECT_DEFAULT_COLOR,
    }),

    labelDialogOpened: (state) => ({ ...state, showNewLabel: true }),
    labelDialogClosed: (state) => ({ ...state, showNewLabel: false }),
    labelNameChanged: (state, { name }) => ({ ...state, newLabelName: name }),
    labelColorChanged: (state, { color }) => ({ ...state, newLabelColor: color }),
    labelFormReset: (state) => ({
      ...state,
      showNewLabel: false,
      newLabelName: '',
      newLabelColor: LABEL_DEFAULT_COLOR,
    }),
  })
  .intents(SidebarFormIntents)
