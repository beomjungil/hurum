import type { Priority } from '../../../todo/domain/entities/todo'

export type ViewType = 'inbox' | 'today' | 'project' | 'label'

export interface FilterState {
  view: ViewType
  selectedProjectId: string | null
  selectedLabelId: string | null
  showCompleted: boolean
  priorityFilter: Priority | null
}
