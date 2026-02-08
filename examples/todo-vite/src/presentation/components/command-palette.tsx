import { useEffect, useMemo, useCallback } from 'react'
import { useStore } from '@hurum/react'
import { useAppStore } from '../hooks/use-app-store'
import {
  CommandPaletteIntents,
  buildCommandRegistry,
} from '../../command-palette/domain'
import type { CommandItem as CommandItemType } from '../../command-palette/domain'
import { FilterIntents } from '../../filter/domain'
import { TodoIntents } from '../../todo/domain'
import { PaletteFormStore, PaletteFormIntents } from '../stores/command-palette-form.store'
import {
  Command,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { HomePage } from './command-palette/home-page'
import { NewTaskPropertyChips, NewTaskPageList, NewTaskFooter } from './command-palette/new-task-page'

interface CommandPaletteProps {
  onOpenNewProject?: () => void
  onOpenNewLabel?: () => void
}

export function CommandPalette({
  onOpenNewProject,
  onOpenNewLabel,
}: CommandPaletteProps) {
  const store = useAppStore()
  const formStore = useStore(PaletteFormStore)
  const { isOpen } = store.use.commandPalette()
  const projectsList = store.use.projectsList()
  const { items: labelsList } = store.use.labels()
  const { showCompleted, view, selectedProjectId, selectedLabelId } = store.use.filter()

  // Form state from store
  const page = formStore.use.currentPage()
  const inputValue = formStore.use.inputValue()
  const taskPriority = formStore.use.taskPriority()
  const taskDueDate = formStore.use.taskDueDate()
  const taskProjectId = formStore.use.taskProjectId()
  const taskLabelIds = formStore.use.taskLabelIds()

  const commands = useMemo(
    () => buildCommandRegistry(projectsList, labelsList),
    [projectsList, labelsList],
  )

  // Reset form when palette closes
  useEffect(() => {
    if (!isOpen) {
      formStore.send(PaletteFormIntents.reset({}))
    }
  }, [isOpen, formStore])

  // Date helpers
  const today = useMemo(() => new Date().toISOString().split('T')[0]!, [])
  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]!
  }, [])
  const nextWeek = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]!
  }, [])

  // Navigate to new-task page with smart defaults
  const enterNewTaskPage = useCallback(() => {
    formStore.send(PaletteFormIntents.pushPage({ page: 'new-task' }))
    formStore.send(PaletteFormIntents.changePriority({ priority: 'p4' }))
    formStore.send(PaletteFormIntents.changeDueDate({ dueDate: view === 'today' ? today : '' }))
    formStore.send(PaletteFormIntents.toggleProject({
      projectId: view === 'project' && selectedProjectId ? selectedProjectId : null,
    }))
    if (view === 'label' && selectedLabelId) {
      formStore.send(PaletteFormIntents.toggleLabel({ labelId: selectedLabelId }))
    }
  }, [formStore, view, selectedProjectId, selectedLabelId, today])

  // Create task
  const handleCreateTask = useCallback(() => {
    if (!inputValue.trim()) return
    store.send(
      TodoIntents.create({
        title: inputValue.trim(),
        priority: taskPriority,
        dueDate: taskDueDate || null,
        projectId: taskProjectId,
        labelIds: taskLabelIds,
      }),
    )
    store.send(CommandPaletteIntents.close({}))
  }, [store, inputValue, taskPriority, taskDueDate, taskProjectId, taskLabelIds])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isOpen) {
          store.send(CommandPaletteIntents.close({}))
        } else {
          store.send(CommandPaletteIntents.open({}))
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [store, isOpen])

  // Handle home page command selection
  const handleSelect = useCallback(
    (command: CommandItemType) => {
      const { action } = command

      if (action.type === 'focusInput') {
        enterNewTaskPage()
        return
      }

      store.send(CommandPaletteIntents.execute({ commandId: command.id }))

      switch (action.type) {
        case 'navigate':
          store.send(
            FilterIntents.changeView({
              view: action.view,
              projectId: action.projectId ?? null,
              labelId: action.labelId ?? null,
            }),
          )
          break
        case 'toggleCompleted':
          store.send(FilterIntents.toggleCompleted({ showCompleted: !showCompleted }))
          break
        case 'filterPriority':
          store.send(FilterIntents.changePriority({ priority: action.priority }))
          break
        case 'openNewProject':
          onOpenNewProject?.()
          break
        case 'openNewLabel':
          onOpenNewLabel?.()
          break
      }
    },
    [store, showCompleted, enterNewTaskPage, onOpenNewProject, onOpenNewLabel],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        store.send(CommandPaletteIntents.close({}))
      }
    },
    [store],
  )

  // Key handler for page navigation + task creation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (page === 'new-task') {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && inputValue.trim()) {
          e.preventDefault()
          handleCreateTask()
          return
        }
        if (e.key === 'Backspace' && !inputValue) {
          e.preventDefault()
          formStore.send(PaletteFormIntents.popPage({}))
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          formStore.send(PaletteFormIntents.popPage({}))
          formStore.send(PaletteFormIntents.typeInput({ value: '' }))
          return
        }
      }
    },
    [page, inputValue, handleCreateTask, formStore],
  )

  const isNewTask = page === 'new-task'

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command
          shouldFilter={page === 'home'}
          onKeyDown={handleKeyDown}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder={isNewTask ? 'Task title...' : 'Type a command or search...'}
            value={inputValue}
            onValueChange={(v) => formStore.send(PaletteFormIntents.typeInput({ value: v }))}
            icon={isNewTask ? <Plus className="mr-2 h-4 w-4 shrink-0 opacity-50" /> : undefined}
          />

          {isNewTask && (
            <NewTaskPropertyChips
              taskPriority={taskPriority}
              taskDueDate={taskDueDate}
              taskProjectId={taskProjectId}
              taskLabelIds={taskLabelIds}
              projectsList={projectsList}
              labelsList={labelsList}
              today={today}
              tomorrow={tomorrow}
            />
          )}

          <CommandList>
            {page === 'home' && (
              <HomePage commands={commands} onSelect={handleSelect} />
            )}
            {isNewTask && (
              <NewTaskPageList
                send={formStore.send}
                taskPriority={taskPriority}
                taskDueDate={taskDueDate}
                taskProjectId={taskProjectId}
                taskLabelIds={taskLabelIds}
                projectsList={projectsList}
                labelsList={labelsList}
                today={today}
                tomorrow={tomorrow}
                nextWeek={nextWeek}
              />
            )}
          </CommandList>

          {isNewTask && (
            <NewTaskFooter
              inputValue={inputValue}
              onCreateTask={handleCreateTask}
            />
          )}
        </Command>
      </DialogContent>
    </Dialog>
  )
}
