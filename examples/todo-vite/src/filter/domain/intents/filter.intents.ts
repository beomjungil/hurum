import { Intents, Intent } from '@hurum/core'
import { ChangeViewCommand } from '../commands/change-view/change-view.command'
import { FilterEvent } from '../events/filter.events'

export const FilterIntents = Intents('Filter', {
  changeView: Intent(ChangeViewCommand),
  toggleCompleted: Intent(FilterEvent.showCompletedToggled),
  changePriority: Intent(FilterEvent.priorityFilterChanged),
})
