import { Store } from '@hurum/core'
import { LabelEvent } from './events/label.events'
import { LabelIntents } from './intents/label.intents'
import { CreateLabelExecutor } from './commands/create-label/create-label.command'
import { DeleteLabelExecutor } from './commands/delete-label/delete-label.command'
import { LoadAllLabelsExecutor } from './commands/load-all-labels/load-all-labels.command'
import type { LabelRepository } from './repository/label.repository'

export const LabelStore = Store({
  state: {
    items: [] as { id: string; name: string; color: string; createdAt: number }[],
  },
})
  .on(LabelEvent, {
    created: (state, { label }) => ({
      ...state,
      items: [...state.items, label],
    }),

    deleted: (state, { id }) => ({
      ...state,
      items: state.items.filter((l) => l.id !== id),
    }),

    allLoaded: (state, { labels }) => ({
      ...state,
      items: labels,
    }),
  })
  .intents(LabelIntents)
  .executors(CreateLabelExecutor, DeleteLabelExecutor, LoadAllLabelsExecutor)
  .deps<{ labelRepo: LabelRepository }>()
