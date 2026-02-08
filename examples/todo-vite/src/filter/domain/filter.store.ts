import { Store } from '@hurum/core'
import type { ViewType } from './entities/filter'
import type { Priority } from '../../todo/domain/entities/todo'
import { FilterEvent } from './events/filter.events'
import { FilterIntents } from './intents/filter.intents'
import { ChangeViewExecutor } from './commands/change-view/change-view.command'

export const FilterStore = Store({
  state: {
    view: 'inbox' as ViewType,
    selectedProjectId: null as string | null,
    selectedLabelId: null as string | null,
    showCompleted: false,
    priorityFilter: null as Priority | null,
  },
})
  .on(FilterEvent, {
    viewChanged: (state, { view, projectId, labelId }) => ({
      ...state,
      view,
      selectedProjectId: projectId,
      selectedLabelId: labelId,
    }),

    showCompletedToggled: (state, { showCompleted }) => ({
      ...state,
      showCompleted,
    }),

    priorityFilterChanged: (state, { priority }) => ({
      ...state,
      priorityFilter: priority,
    }),
  })
  .intents(FilterIntents)
  .executors(ChangeViewExecutor)
