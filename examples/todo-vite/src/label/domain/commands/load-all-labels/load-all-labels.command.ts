import { CommandExecutor } from '@hurum/core'
import { LabelEvent } from '../../events/label.events'
import type { LabelRepository } from '../../repository/label.repository'

export const [LoadAllLabelsCommand, LoadAllLabelsExecutor] = CommandExecutor<
  {},
  { labelRepo: LabelRepository }
>('LoadAllLabels', async (_command, { deps, emit, signal }) => {
  try {
    const labels = await deps.labelRepo.findAll()
    if (signal.aborted) return
    emit(LabelEvent.allLoaded({ labels }))
  } catch (e) {
    if (signal.aborted) return
    emit(LabelEvent.loadFailed({ error: e instanceof Error ? e.message : String(e) }))
  }
})
