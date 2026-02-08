import { CommandExecutor } from '@hurum/core'
import { ProjectEvent } from '../../events/project.events'
import type { ProjectRepository } from '../../repository/project.repository'

export const [LoadAllProjectsCommand, LoadAllProjectsExecutor] = CommandExecutor<
  {},
  { projectRepo: ProjectRepository }
>('LoadAllProjects', async (_command, { deps, emit, signal }) => {
  try {
    const projects = await deps.projectRepo.findAll()
    if (signal.aborted) return
    emit(ProjectEvent.allLoaded({ projects }))
  } catch (e) {
    if (signal.aborted) return
    emit(ProjectEvent.loadFailed({ error: e instanceof Error ? e.message : String(e) }))
  }
})
