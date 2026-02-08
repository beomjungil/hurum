import type { Project } from '../entities/project'

export interface ProjectRepository {
  findAll(): Promise<Project[]>
  save(project: Project): Promise<Project>
  remove(id: string): Promise<void>
}
