import { Intents, Intent } from '@hurum/core'
import { CreateLabelCommand } from '../commands/create-label/create-label.command'
import { DeleteLabelCommand } from '../commands/delete-label/delete-label.command'
import { LoadAllLabelsCommand } from '../commands/load-all-labels/load-all-labels.command'

export const LabelIntents = Intents('Label', {
  create: Intent(CreateLabelCommand),
  delete: Intent(DeleteLabelCommand),
  loadAll: Intent(LoadAllLabelsCommand),
})
