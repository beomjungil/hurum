import type { Project } from '../../domain/entities/project'
import type { ProjectRepository } from '../../domain/repository/project.repository'

export class ProjectRepositoryMemory implements ProjectRepository {
  private items: Project[] = []

  async findAll(): Promise<Project[]> {
    return [...this.items]
  }

  async save(project: Project): Promise<Project> {
    const index = this.items.findIndex((p) => p.id === project.id)
    if (index >= 0) {
      this.items[index] = project
    } else {
      this.items.push(project)
    }
    return project
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id !== id)
  }
}
