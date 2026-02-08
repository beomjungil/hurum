import type { Priority } from '../../todo/domain/entities/todo'

export const priorityConfig: Record<Priority, { color: string; label: string; shortLabel: string; dot: string; border: string }> = {
  p1: { color: 'text-red-500', label: 'Priority 1', shortLabel: 'P1', dot: 'bg-red-500', border: 'border-l-red-500' },
  p2: { color: 'text-orange-500', label: 'Priority 2', shortLabel: 'P2', dot: 'bg-orange-500', border: 'border-l-orange-500' },
  p3: { color: 'text-blue-500', label: 'Priority 3', shortLabel: 'P3', dot: 'bg-blue-500', border: 'border-l-blue-500' },
  p4: { color: 'text-muted-foreground', label: 'Priority 4', shortLabel: 'P4', dot: 'bg-muted-foreground', border: 'border-l-transparent' },
}

export const priorities = Object.keys(priorityConfig) as Priority[]
