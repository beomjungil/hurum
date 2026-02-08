import { CommandExecutor } from '@hurum/core'
import { LabelEvent } from '../../events/label.events'
import type { Label } from '../../entities/label'
import type { LabelRepository } from '../../repository/label.repository'

export const [CreateLabelCommand, CreateLabelExecutor] = CommandExecutor<
  { name: string; color: string },
  { labelRepo: LabelRepository }
>('CreateLabel', async (command, { deps, emit, signal }) => {
  const label: Label = {
    id: crypto.randomUUID(),
    name: command.name,
    color: command.color,
    createdAt: Date.now(),
  }

  await deps.labelRepo.save(label)
  if (signal.aborted) return

  emit(LabelEvent.created({ label }))
})
