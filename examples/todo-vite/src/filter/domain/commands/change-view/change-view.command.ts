import { CommandExecutor } from '@hurum/core'
import { FilterEvent } from '../../events/filter.events'
import type { ViewType } from '../../entities/filter'

export const [ChangeViewCommand, ChangeViewExecutor] = CommandExecutor<{
  view: ViewType; projectId?: string | null; labelId?: string | null
}>('ChangeView', (cmd, { emit }) => {
  emit(FilterEvent.viewChanged({
    view: cmd.view,
    projectId: cmd.projectId ?? null,
    labelId: cmd.labelId ?? null,
  }))
})
