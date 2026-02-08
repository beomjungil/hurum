import type { CommandItem } from './entities/command-item'
import type { Priority } from '../../todo/domain/entities/todo'

interface Project {
  id: string
  name: string
  color: string
}

interface Label {
  id: string
  name: string
  color: string
}

export function buildCommandRegistry(projects: Project[], labels: Label[]): CommandItem[] {
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav:inbox',
      label: 'Go to Inbox',
      category: 'navigation',
      icon: 'inbox',
      action: { type: 'navigate', view: 'inbox' },
      keywords: ['inbox', 'home', 'all'],
    },
    {
      id: 'nav:today',
      label: 'Go to Today',
      category: 'navigation',
      icon: 'calendar',
      action: { type: 'navigate', view: 'today' },
      keywords: ['today', 'due', 'schedule'],
    },

    // Dynamic project navigation
    ...projects.map((p): CommandItem => ({
      id: `nav:project:${p.id}`,
      label: `Go to ${p.name}`,
      category: 'navigation',
      icon: 'hash',
      action: { type: 'navigate', view: 'project', projectId: p.id },
      keywords: ['project', p.name.toLowerCase()],
    })),

    // Dynamic label navigation
    ...labels.map((l): CommandItem => ({
      id: `nav:label:${l.id}`,
      label: `Go to ${l.name}`,
      category: 'navigation',
      icon: 'tag',
      action: { type: 'navigate', view: 'label', labelId: l.id },
      keywords: ['label', l.name.toLowerCase()],
    })),

    // Actions
    {
      id: 'action:new-task',
      label: 'New Task',
      category: 'action',
      icon: 'plus',
      action: { type: 'focusInput' },
      keywords: ['add', 'create', 'task', 'todo', 'new'],
    },
    {
      id: 'action:toggle-completed',
      label: 'Toggle Show Completed',
      category: 'action',
      icon: 'eye',
      action: { type: 'toggleCompleted' },
      keywords: ['show', 'hide', 'completed', 'done', 'toggle'],
    },

    // Filter by priority
    ...(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p): CommandItem => ({
      id: `filter:priority:${p}`,
      label: `Filter by ${p.toUpperCase()}`,
      category: 'filter',
      icon: 'flag',
      action: { type: 'filterPriority', priority: p },
      keywords: ['priority', 'filter', p],
    })),
    {
      id: 'filter:priority:clear',
      label: 'Clear Priority Filter',
      category: 'filter',
      icon: 'x',
      action: { type: 'filterPriority', priority: null },
      keywords: ['clear', 'reset', 'filter', 'priority'],
    },

    // Create
    {
      id: 'create:project',
      label: 'New Project',
      category: 'create',
      icon: 'folder-plus',
      action: { type: 'openNewProject' },
      keywords: ['create', 'new', 'project', 'add'],
    },
    {
      id: 'create:label',
      label: 'New Label',
      category: 'create',
      icon: 'tag',
      action: { type: 'openNewLabel' },
      keywords: ['create', 'new', 'label', 'tag', 'add'],
    },
  ]

  return commands
}
