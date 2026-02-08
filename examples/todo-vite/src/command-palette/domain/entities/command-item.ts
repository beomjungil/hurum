import type { ViewType } from '../../../filter/domain/entities/filter'
import type { Priority } from '../../../todo/domain/entities/todo'

export type CommandCategory = 'navigation' | 'action' | 'filter' | 'create'

export type CommandAction =
  | { type: 'navigate'; view: ViewType; projectId?: string; labelId?: string }
  | { type: 'toggleCompleted' }
  | { type: 'filterPriority'; priority: Priority | null }
  | { type: 'focusInput' }
  | { type: 'openNewProject' }
  | { type: 'openNewLabel' }

export interface CommandItem {
  id: string
  label: string
  category: CommandCategory
  icon?: string
  action: CommandAction
  keywords?: string[]
}
