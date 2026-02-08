import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '@hurum/react'
import { useAppStore } from '../hooks/use-app-store'
import { TodoIntents } from '../../todo/domain'
import type { Todo, Priority } from '../../todo/domain/entities/todo'
import { TodoDetailModalStore, TodoDetailModalIntents } from '../stores/todo-detail-modal.store'
import { priorityConfig } from '../constants/priority'
import { formatDate } from '../utils/format-date'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Trash2, Flag, Calendar, FolderOpen, Tag, X, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {
  const store = useAppStore()
  const modalStore = useStore(TodoDetailModalStore)
  const projectsList = store.use.projectsList()
  const { items: labelsList } = store.use.labels()
  const subtaskCounts = store.use.subtaskCounts()

  const todoLabels = labelsList.filter((l) => todo.labelIds.includes(l.id))
  const project = projectsList.find((p) => p.id === todo.projectId)
  const priority = priorityConfig[todo.priority]

  const subtaskCount = subtaskCounts[todo.id]

  const handleToggle = () => {
    store.send(TodoIntents.toggle({
      id: todo.id,
      completed: !todo.completed,
    }))
  }

  const handleDelete = () => {
    store.send(TodoIntents.delete({ id: todo.id }))
  }

  const handleOpenDetail = () => {
    modalStore.send(TodoDetailModalIntents.open({ todoId: todo.id }))
  }

  const handleSetProject = (projectId: string | null) => {
    store.send(TodoIntents.assignProject({ id: todo.id, projectId }))
  }

  const handleToggleLabel = (labelId: string) => {
    store.send(TodoIntents.toggleLabel({ id: todo.id, labelId }))
  }

  const handleSetDueDate = (dueDate: string | null) => {
    store.send(TodoIntents.setDueDate({ id: todo.id, dueDate }))
  }

  return (
    <motion.div
      className={cn(
        'group flex items-start gap-3 px-6 py-3 hover:bg-muted/50 border-l-2',
        priority.border,
      )}
      animate={{ opacity: todo.completed ? 0.5 : 1 }}
      transition={{ duration: 0.3 }}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={handleToggle}
        className={cn(
          'mt-0.5 rounded-full h-5 w-5 transition-colors duration-200',
          !todo.completed && priority.color,
          !todo.completed && `border-current`
        )}
      />

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-sm cursor-pointer leading-snug transition-all duration-300',
            todo.completed && 'line-through text-muted-foreground'
          )}
          onClick={handleOpenDetail}
        >
          {todo.title}
        </div>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <AnimatePresence>
            {subtaskCount && (
              <motion.span
                key="subtasks"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <ListChecks className="h-3 w-3" />
                {subtaskCount.done}/{subtaskCount.total}
              </motion.span>
            )}
            {todo.dueDate && (
              <motion.span
                key="due"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Calendar className="h-3 w-3" />
                {formatDate(todo.dueDate)}
              </motion.span>
            )}
            {project && (
              <motion.div
                key={`project-${project.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Badge variant="outline" className="h-5 gap-1 text-xs font-normal px-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                  {project.name}
                </Badge>
              </motion.div>
            )}
            {todoLabels.map((label) => (
              <motion.div
                key={`label-${label.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Badge
                  className="h-5 text-xs font-normal px-1.5 shadow-none"
                  style={{ backgroundColor: label.color + '18', color: label.color, border: 'none' }}
                >
                  {label.name}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Project */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <FolderOpen className={cn('h-3.5 w-3.5', project ? 'text-foreground' : 'text-muted-foreground')} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => handleSetProject(null)}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
              No project
              {!todo.projectId && <span className="ml-auto text-xs text-muted-foreground">&#10003;</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projectsList.map((p) => (
              <DropdownMenuItem
                key={p.id}
                className="gap-2"
                onSelect={() => handleSetProject(p.id)}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                {p.name}
                {todo.projectId === p.id && <span className="ml-auto text-xs text-muted-foreground">&#10003;</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Labels */}
        {labelsList.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Tag className={cn('h-3.5 w-3.5', todoLabels.length > 0 ? 'text-foreground' : 'text-muted-foreground')} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {labelsList.map((label) => (
                <DropdownMenuCheckboxItem
                  key={label.id}
                  checked={todo.labelIds.includes(label.id)}
                  onCheckedChange={() => handleToggleLabel(label.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Due Date */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Calendar className={cn('h-3.5 w-3.5', todo.dueDate ? 'text-foreground' : 'text-muted-foreground')} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-2">
            <div className="flex flex-col gap-2">
              <Input
                type="date"
                value={todo.dueDate ?? ''}
                onChange={(e) => handleSetDueDate(e.target.value || null)}
                className="h-8 text-sm"
              />
              <DropdownMenuItem
                className="gap-2 justify-center text-muted-foreground"
                onSelect={() => handleSetDueDate(null)}
              >
                <X className="h-3.5 w-3.5" />
                Clear date
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Flag className={cn('h-3.5 w-3.5', priority.color)} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
              <DropdownMenuItem
                key={p}
                className="gap-2"
                onSelect={() => store.send(TodoIntents.setPriority({ id: todo.id, priority: p }))}
              >
                <span className={cn('h-2 w-2 rounded-full', priorityConfig[p].dot)} />
                {priorityConfig[p].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}

