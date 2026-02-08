import { ProjectSchema, type Project } from '../../domain/entities/project'

export function parseProject(raw: unknown): Project {
  return ProjectSchema.parse(raw)
}

export function parseProjects(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseProject)
}
