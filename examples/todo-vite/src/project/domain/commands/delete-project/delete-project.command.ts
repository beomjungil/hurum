import { CommandExecutor } from '@hurum/core'
import { ProjectEvent } from '../../events/project.events'
import type { ProjectRepository } from '../../repository/project.repository'

export const [DeleteProjectCommand, DeleteProjectExecutor] = CommandExecutor<
  { id: string },
  { projectRepo: ProjectRepository }
>('DeleteProject', async (command, { deps, emit, signal }) => {
  await deps.projectRepo.remove(command.id)
  if (signal.aborted) return
  emit(ProjectEvent.deleted({ id: command.id }))
})
