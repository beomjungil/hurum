import { CommandExecutor } from '@hurum/core'
import { ProjectEvent } from '../../events/project.events'
import type { Project } from '../../entities/project'
import type { ProjectRepository } from '../../repository/project.repository'

export const [CreateProjectCommand, CreateProjectExecutor] = CommandExecutor<
  { name: string; color: string },
  { projectRepo: ProjectRepository }
>('CreateProject', async (command, { deps, emit, signal }) => {
  const project: Project = {
    id: crypto.randomUUID(),
    name: command.name,
    color: command.color,
    createdAt: Date.now(),
  }

  await deps.projectRepo.save(project)
  if (signal.aborted) return

  emit(ProjectEvent.created({ project }))
})
