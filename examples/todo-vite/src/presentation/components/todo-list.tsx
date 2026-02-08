import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useStore } from '@hurum/react'
import { AnimatePresence, motion } from 'motion/react'
import { useAppStore } from '../hooks/use-app-store'
import { TodoIntents } from '../../todo/domain'
import type { Priority } from '../../todo/domain/entities/todo'
import { NewTodoFormStore, NewTodoFormIntents } from '../stores/new-todo-form.store'
import { priorityConfig, priorities } from '../constants/priority'
import { TodoItem } from './todo-item'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Loader2, FolderOpen, Tag, X } from 'lucide-react'

export interface TodoListHandle {
  focusInput(): void
}

export const TodoList = forwardRef<TodoListHandle>(function TodoList(_props, ref) {
  const store = useAppStore()
  const formStore = useStore(NewTodoFormStore)
  const newTitle = formStore.use.title()
  const newPriority = formStore.use.priority()
  const newDueDate = formStore.use.dueDate()
  const newProjectId = formStore.use.projectId()
  const newLabelIds = formStore.use.labelIds()
  const filteredTodos = store.use.filteredTodos()
  const { searching, validationError } = store.use.todo()
  const { view, selectedProjectId, selectedLabelId } = store.use.filter()
  const projectsList = store.use.projectsList()
  const { items: labelsList } = store.use.labels()
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focusInput() {
      inputRef.current?.focus()
    },
  }))

  const handleAdd = () => {
    if (!newTitle.trim()) return
    store.send(TodoIntents.create({
      title: newTitle,
      priority: newPriority,
      projectId: newProjectId ?? (view === 'project' ? selectedProjectId : null),
      labelIds: newLabelIds.length > 0 ? newLabelIds : (view === 'label' && selectedLabelId ? [selectedLabelId] : []),
      dueDate: newDueDate || (view === 'today' ? new Date().toISOString().split('T')[0] : null),
    }))
    formStore.send(NewTodoFormIntents.reset({}))
    inputRef.current?.focus()
  }

  const handleToggleLabel = (labelId: string) => {
    const next = newLabelIds.includes(labelId)
      ? newLabelIds.filter((id) => id !== labelId)
      : [...newLabelIds, labelId]
    formStore.send(NewTodoFormIntents.setLabelIds({ labelIds: next }))
  }

  const selectedProject = projectsList.find((p) => p.id === newProjectId)
  const selectedLabels = labelsList.filter((l) => newLabelIds.includes(l.id))

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => formStore.send(NewTodoFormIntents.setTitle({ title: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 min-w-[200px]"
          />
          <div className="flex items-center gap-2">
            <Select value={newPriority} onValueChange={(v) => formStore.send(NewTodoFormIntents.setPriority({ priority: v as Priority }))}>
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${priorityConfig[p].dot}`} />{priorityConfig[p].shortLabel}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project selector — DropdownMenu for consistent UX */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {selectedProject ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color }} />
                      {selectedProject.name}
                    </span>
                  ) : (
                    'Project'
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => formStore.send(NewTodoFormIntents.setProjectId({ projectId: null }))}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                  No project
                  {!newProjectId && <span className="ml-auto text-xs text-muted-foreground">&#10003;</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projectsList.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className="gap-2"
                    onSelect={() => formStore.send(NewTodoFormIntents.setProjectId({ projectId: p.id }))}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                    {newProjectId === p.id && <span className="ml-auto text-xs text-muted-foreground">&#10003;</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Label selector */}
            {labelsList.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {selectedLabels.length > 0 ? (
                      <span className="flex items-center gap-1">
                        {selectedLabels.length} label{selectedLabels.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      'Labels'
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {labelsList.map((label) => (
                    <DropdownMenuCheckboxItem
                      key={label.id}
                      checked={newLabelIds.includes(label.id)}
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

            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => formStore.send(NewTodoFormIntents.setDueDate({ dueDate: e.target.value }))}
              className="w-36 h-9"
            />
            <Button onClick={handleAdd} size="sm" className="h-9 gap-1.5 px-4">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
        {validationError && (
          <p className="mt-2 text-sm text-destructive">{validationError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {searching && (
          <div className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}
        {filteredTodos.length === 0 && !searching && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="h-16 w-16 stroke-[0.75] mb-4" />
            <p className="text-base font-medium mb-1">All clear</p>
            <p className="text-sm">Add a task above to get started.</p>
          </div>
        )}
        <div className="divide-y">
          <AnimatePresence initial={false}>
            {filteredTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, transition: { opacity: { duration: 0.15 }, height: { duration: 0.25, delay: 0.1 } } }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <TodoItem todo={todo} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
})

function Inbox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}
