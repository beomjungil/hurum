import type { Project } from '../../domain/entities/project'
import type { ProjectRepository } from '../../domain/repository/project.repository'
import { parseProjects } from '../converters/project.converter'

const STORAGE_KEY = 'hurum-projects'

export class ProjectRepositoryLocal implements ProjectRepository {
  async findAll(): Promise<Project[]> {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return parseProjects(JSON.parse(raw))
  }

  async save(project: Project): Promise<Project> {
    const all = await this.findAll()
    const index = all.findIndex((p) => p.id === project.id)
    if (index >= 0) {
      all[index] = project
    } else {
      all.push(project)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    return project
  }

  async remove(id: string): Promise<void> {
    const all = await this.findAll()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter((p) => p.id !== id)))
  }
}
