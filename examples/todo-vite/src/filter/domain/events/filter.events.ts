import { Events, Event } from '@hurum/core'
import type { ViewType } from '../entities/filter'
import type { Priority } from '../../../todo/domain/entities/todo'

export const FilterEvent = Events('Filter', {
  viewChanged: Event<{ view: ViewType; projectId: string | null; labelId: string | null }>(),
  showCompletedToggled: Event<{ showCompleted: boolean }>(),
  priorityFilterChanged: Event<{ priority: Priority | null }>(),
})
