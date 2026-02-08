import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@hurum/react'
import { useAppStore } from '../hooks/use-app-store'
import { TodoIntents } from '../../todo/domain'
import type { Priority } from '../../todo/domain/entities/todo'
import { TodoDetailModalStore, TodoDetailModalIntents } from '../stores/todo-detail-modal.store'
import { priorityConfig } from '../constants/priority'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Flag, Calendar, FolderOpen, Tag, X, Trash2, Plus, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TodoDetailModal() {
  const store = useAppStore()
  const modalStore = useStore(TodoDetailModalStore)
  const openTodoId = modalStore.use.openTodoId()
  const { items: allTodos } = store.use.todo()
  const projectsList = store.use.projectsList()
  const { items: labelsList } = store.use.labels()

  const todo = useMemo(() => {
    if (!openTodoId) return null
    return allTodos.find((t) => t.id === openTodoId) ?? null
  }, [openTodoId, allTodos])

  const subtodos = useMemo(() => {
    if (!openTodoId) return []
    return allTodos.filter((t) => t.parentId === openTodoId)
  }, [openTodoId, allTodos])

  const subtodoDone = subtodos.filter((t) => t.completed).length

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  useEffect(() => {
    if (todo) {
      setEditTitle(todo.title)
      setEditDescription(todo.description)
    }
  }, [todo?.id, todo?.title, todo?.description])

  const handleClose = () => {
    modalStore.send(TodoDetailModalIntents.close({}))
  }

  const handleSaveTitle = () => {
    if (!todo) return
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== todo.title) {
      store.send(TodoIntents.editTitle({ id: todo.id, title: trimmed }))
    } else {
      setEditTitle(todo.title)
    }
  }

  const handleSaveDescription = () => {
    if (!todo) return
    const trimmed = editDescription.trim()
    if (trimmed !== todo.description) {
      store.send(TodoIntents.editDescription({ id: todo.id, description: trimmed }))
    }
  }

  const handleToggle = () => {
    if (!todo) return
    store.send(TodoIntents.toggle({ id: todo.id, completed: !todo.completed }))
  }

  const handleDelete = () => {
    if (!todo) return
    store.send(TodoIntents.delete({ id: todo.id }))
    handleClose()
  }

  const handleSetPriority = (priority: Priority) => {
    if (!todo) return
    store.send(TodoIntents.setPriority({ id: todo.id, priority }))
  }

  const handleSetDueDate = (dueDate: string | null) => {
    if (!todo) return
    store.send(TodoIntents.setDueDate({ id: todo.id, dueDate }))
  }

  const handleSetProject = (projectId: string | null) => {
    if (!todo) return
    store.send(TodoIntents.assignProject({ id: todo.id, projectId }))
  }

  const handleToggleLabel = (labelId: string) => {
    if (!todo) return
    store.send(TodoIntents.toggleLabel({ id: todo.id, labelId }))
  }

  const handleAddSubtask = () => {
    if (!todo || !newSubtaskTitle.trim()) return
    store.send(TodoIntents.create({ title: newSubtaskTitle.trim(), parentId: todo.id }))
    setNewSubtaskTitle('')
  }

  const handleToggleSubtask = (subtaskId: string, completed: boolean) => {
    store.send(TodoIntents.toggle({ id: subtaskId, completed: !completed }))
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    store.send(TodoIntents.delete({ id: subtaskId }))
  }

  const todoProject = todo ? projectsList.find((p) => p.id === todo.projectId) : null
  const todoLabels = todo ? labelsList.filter((l) => todo.labelIds.includes(l.id)) : []
  const priority = todo ? priorityConfig[todo.priority] : priorityConfig.p4

  return (
    <Dialog open={!!todo} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        {todo && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={handleToggle}
                  className={cn(
                    'mt-1 rounded-full h-5 w-5 transition-colors duration-200',
                    !todo.completed && priority.color,
                    !todo.completed && 'border-current',
                  )}
                />
                <div className="flex-1">
                  <DialogTitle className="sr-only">{todo.title}</DialogTitle>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                    className={cn(
                      'text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0',
                      todo.completed && 'line-through text-muted-foreground',
                    )}
                  />
                </div>
              </div>
              <DialogDescription className="sr-only">
                Edit todo details
              </DialogDescription>
            </DialogHeader>

            {/* Description */}
            <div>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleSaveDescription}
                placeholder="Add a description..."
                className="w-full min-h-[80px] text-sm bg-transparent border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              {/* Priority */}
              <div className="flex items-center gap-2">
                <Flag className={cn('h-4 w-4', priority.color)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
                      <span className={cn('h-2 w-2 rounded-full', priority.dot)} />
                      {priority.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
                      <DropdownMenuItem
                        key={p}
                        className="gap-2"
                        onSelect={() => handleSetPriority(p)}
                      >
                        <span className={cn('h-2 w-2 rounded-full', priorityConfig[p].dot)} />
                        {priorityConfig[p].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={todo.dueDate ?? ''}
                  onChange={(e) => handleSetDueDate(e.target.value || null)}
                  className="h-8 text-sm flex-1"
                />
                {todo.dueDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleSetDueDate(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Project */}
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
                      {todoProject ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: todoProject.color }} />
                          {todoProject.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No project</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem className="gap-2" onSelect={() => handleSetProject(null)}>
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
              </div>

              {/* Labels */}
              {labelsList.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
                        {todoLabels.length > 0 ? (
                          <span>{todoLabels.length} label{todoLabels.length !== 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-muted-foreground">No labels</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
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
                </div>
              )}
            </div>

            {/* Label badges */}
            {todoLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {todoLabels.map((label) => (
                  <Badge
                    key={label.id}
                    className="h-5 text-xs font-normal px-1.5 shadow-none"
                    style={{ backgroundColor: label.color + '18', color: label.color, border: 'none' }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Sub-tasks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sub-tasks</span>
                {subtodos.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {subtodoDone}/{subtodos.length}
                  </span>
                )}
              </div>

              {subtodos.length > 0 && (
                <div className="space-y-1 mb-3">
                  {subtodos.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 group/sub py-1 px-1 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={sub.completed}
                        onCheckedChange={() => handleToggleSubtask(sub.id, sub.completed)}
                        className="h-4 w-4 rounded-full"
                      />
                      <span className={cn(
                        'flex-1 text-sm',
                        sub.completed && 'line-through text-muted-foreground',
                      )}>
                        {sub.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/sub:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSubtask(sub.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add a sub-task..."
                  className="h-8 text-sm border-none shadow-none px-0 focus-visible:ring-0"
                />
              </div>
            </div>

            <Separator />

            {/* Delete */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete task
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
