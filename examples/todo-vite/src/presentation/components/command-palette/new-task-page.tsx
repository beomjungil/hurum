import type { PreparedIntent } from '@hurum/core'
import { PaletteFormIntents } from '../../stores/command-palette-form.store'
import { priorityConfig, priorities } from '../../constants/priority'
import type { Priority } from '../../../todo/domain/entities/todo'
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  CalendarDays,
  Hash,
  Tag,
  X,
  Check,
  CornerDownLeft,
} from 'lucide-react'

const priorityOptions = priorities.map((p) => ({
  value: p,
  label: priorityConfig[p].label,
  dot: priorityConfig[p].dot,
}))

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

interface NewTaskPageProps {
  send: <T>(prepared: PreparedIntent<T>) => void
  taskPriority: Priority
  taskDueDate: string
  taskProjectId: string | null
  taskLabelIds: string[]
  projectsList: Project[]
  labelsList: Label[]
  today: string
  tomorrow: string
  nextWeek: string
  inputValue: string
  onCreateTask: () => void
}

export function NewTaskPropertyChips({
  taskPriority,
  taskDueDate,
  taskProjectId,
  taskLabelIds,
  projectsList,
  labelsList,
  today,
  tomorrow,
}: Pick<NewTaskPageProps, 'taskPriority' | 'taskDueDate' | 'taskProjectId' | 'taskLabelIds' | 'projectsList' | 'labelsList' | 'today' | 'tomorrow'>) {
  const selectedProject = projectsList.find((p) => p.id === taskProjectId)
  const selectedLabels = labelsList.filter((l) => taskLabelIds.includes(l.id))

  return (
    <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
      <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
        <span className={`h-1.5 w-1.5 rounded-full ${priorityOptions.find((p) => p.value === taskPriority)?.dot}`} />
        {priorityOptions.find((p) => p.value === taskPriority)?.label}
      </span>
      {taskDueDate && (
        <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
          <CalendarDays className="h-3 w-3" />
          {taskDueDate === today ? 'Today' : taskDueDate === tomorrow ? 'Tomorrow' : taskDueDate}
        </span>
      )}
      {selectedProject && (
        <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selectedProject.color }} />
          {selectedProject.name}
        </span>
      )}
      {selectedLabels.map((label) => (
        <span
          key={label.id}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
          style={{ backgroundColor: label.color + '18', color: label.color }}
        >
          {label.name}
        </span>
      ))}
    </div>
  )
}

export function NewTaskPageList({
  send,
  taskPriority,
  taskDueDate,
  taskProjectId,
  taskLabelIds,
  projectsList,
  labelsList,
  today,
  tomorrow,
  nextWeek,
}: Omit<NewTaskPageProps, 'inputValue' | 'onCreateTask'>) {
  return (
    <>
      <CommandGroup heading="Priority">
        {priorityOptions.map((p) => (
          <CommandItem
            key={p.value}
            value={`priority-${p.value}`}
            onSelect={() => send(PaletteFormIntents.changePriority({ priority: p.value }))}
          >
            <span className={`h-2 w-2 rounded-full ${p.dot}`} />
            <span>{p.label}</span>
            {taskPriority === p.value && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup heading="Due Date">
        <CommandItem
          value="due-today"
          onSelect={() => send(PaletteFormIntents.changeDueDate({ dueDate: taskDueDate === today ? '' : today }))}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Today</span>
          {taskDueDate === today && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </CommandItem>
        <CommandItem
          value="due-tomorrow"
          onSelect={() => send(PaletteFormIntents.changeDueDate({ dueDate: taskDueDate === tomorrow ? '' : tomorrow }))}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Tomorrow</span>
          {taskDueDate === tomorrow && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </CommandItem>
        <CommandItem
          value="due-next-week"
          onSelect={() => send(PaletteFormIntents.changeDueDate({ dueDate: taskDueDate === nextWeek ? '' : nextWeek }))}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Next Week</span>
          {taskDueDate === nextWeek && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </CommandItem>
        {taskDueDate && taskDueDate !== today && taskDueDate !== tomorrow && taskDueDate !== nextWeek && (
          <CommandItem
            value="due-clear"
            onSelect={() => send(PaletteFormIntents.changeDueDate({ dueDate: '' }))}
          >
            <X className="h-4 w-4" />
            <span>Clear Date</span>
          </CommandItem>
        )}
      </CommandGroup>

      {projectsList.length > 0 && (
        <>
          <CommandSeparator />
          <CommandGroup heading="Project">
            {projectsList.map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.id}`}
                onSelect={() =>
                  send(PaletteFormIntents.toggleProject({
                    projectId: taskProjectId === project.id ? null : project.id,
                  }))
                }
              >
                <Hash className="h-4 w-4" style={{ color: project.color }} />
                <span>{project.name}</span>
                {taskProjectId === project.id && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </>
      )}

      {labelsList.length > 0 && (
        <>
          <CommandSeparator />
          <CommandGroup heading="Labels">
            {labelsList.map((label) => (
              <CommandItem
                key={label.id}
                value={`label-${label.id}`}
                onSelect={() => send(PaletteFormIntents.toggleLabel({ labelId: label.id }))}
              >
                <Tag className="h-4 w-4" style={{ color: label.color }} />
                <span>{label.name}</span>
                {taskLabelIds.includes(label.id) && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </>
      )}
    </>
  )
}

export function NewTaskFooter({
  inputValue,
  onCreateTask,
}: Pick<NewTaskPageProps, 'inputValue' | 'onCreateTask'>) {
  return (
    <div className="flex items-center justify-between border-t px-3 py-2">
      <span className="text-xs text-muted-foreground">
        Set properties with <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd>{' '}
        <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↵</kbd>
      </span>
      <button
        onClick={onCreateTask}
        disabled={!inputValue.trim()}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        <CornerDownLeft className="h-3 w-3" />
        Create
        <kbd className="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px]">⌘↵</kbd>
      </button>
    </div>
  )
}
