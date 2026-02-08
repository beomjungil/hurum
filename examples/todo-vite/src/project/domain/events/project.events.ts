import { Events, Event } from '@hurum/core'
import type { Project } from '../entities/project'

export const ProjectEvent = Events('Project', {
  created: Event<{ project: Project }>(),
  deleted: Event<{ id: string }>(),
  allLoaded: Event<{ projects: Project[] }>(),
  loadFailed: Event<{ error: string }>(),
  updated: Event<{ id: string; name?: string; color?: string }>(),
})
