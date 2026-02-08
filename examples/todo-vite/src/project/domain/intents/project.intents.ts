import { Intents, Intent } from '@hurum/core'
import { CreateProjectCommand } from '../commands/create-project/create-project.command'
import { DeleteProjectCommand } from '../commands/delete-project/delete-project.command'
import { LoadAllProjectsCommand } from '../commands/load-all-projects/load-all-projects.command'

export const ProjectIntents = Intents('Project', {
  create: Intent(CreateProjectCommand),
  delete: Intent(DeleteProjectCommand),
  loadAll: Intent(LoadAllProjectsCommand),
})
