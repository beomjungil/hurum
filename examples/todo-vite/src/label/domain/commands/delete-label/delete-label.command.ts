import { CommandExecutor } from '@hurum/core'
import { LabelEvent } from '../../events/label.events'
import type { LabelRepository } from '../../repository/label.repository'

export const [DeleteLabelCommand, DeleteLabelExecutor] = CommandExecutor<
  { id: string },
  { labelRepo: LabelRepository }
>('DeleteLabel', async (command, { deps, emit, signal }) => {
  await deps.labelRepo.remove(command.id)
  if (signal.aborted) return
  emit(LabelEvent.deleted({ id: command.id }))
})
