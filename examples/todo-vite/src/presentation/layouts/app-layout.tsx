import { useRef, useCallback, useState } from 'react'
import { useStore } from '@hurum/react'
import { useAppStore } from '../hooks/use-app-store'
import { ProjectSidebar, type ProjectSidebarHandle } from '../components/project-sidebar'
import { TodoList, type TodoListHandle } from '../components/todo-list'
import { SearchInput } from '../components/search-input'
import { TodayView } from '../components/today-view'
import { CommandPalette } from '../components/command-palette'
import { TodoDetailModal } from '../components/todo-detail-modal'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CommandPaletteIntents } from '../../command-palette/domain'
import { ThemeStore, ThemeIntents } from '../../theme/domain'
import { Sun, Moon } from 'lucide-react'

const themeDeps = {
  getPrefersDark: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  applyTheme: (dark: boolean) => document.documentElement.classList.toggle('dark', dark),
}

export function AppLayout() {
  const store = useAppStore()
  const [themeStoreInstance] = useState(() =>
    ThemeStore.create({
      initialState: { dark: themeDeps.getPrefersDark() },
      deps: themeDeps,
    }),
  )
  const themeStore = useStore(themeStoreInstance)
  const dark = themeStore.use.dark()
  const { view } = store.use.filter()
  const sidebarRef = useRef<ProjectSidebarHandle>(null)
  const todoListRef = useRef<TodoListHandle>(null)

  const handleOpenNewProject = useCallback(() => {
    sidebarRef.current?.openNewProject()
  }, [])

  const handleOpenNewLabel = useCallback(() => {
    sidebarRef.current?.openNewLabel()
  }, [])

  return (
    <SidebarProvider>
        <ProjectSidebar ref={sidebarRef} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">
              {view === 'inbox' && 'Inbox'}
              {view === 'today' && 'Today'}
              {view === 'project' && <ProjectTitle />}
              {view === 'label' && <LabelTitle />}
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => themeStore.send(ThemeIntents.toggle({ dark: !dark }))}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
                onClick={() => store.send(CommandPaletteIntents.open({}))}
              >
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">&#8984;</span>K
                </kbd>
              </Button>
              <SearchInput />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {view === 'today' ? <TodayView ref={todoListRef} /> : <TodoList ref={todoListRef} />}
          </div>
          <ProgressBar />
        </SidebarInset>
        <CommandPalette
          onOpenNewProject={handleOpenNewProject}
          onOpenNewLabel={handleOpenNewLabel}
        />
        <TodoDetailModal />
    </SidebarProvider>
  )
}

function ProjectTitle() {
  const store = useAppStore()
  const { selectedProjectId } = store.use.filter()
  const projectsList = store.use.projectsList()
  const project = projectsList.find((p) => p.id === selectedProjectId)
  return (
    <span className="flex items-center gap-2">
      {project && (
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: project.color }}
        />
      )}
      {project?.name ?? 'Project'}
    </span>
  )
}

function LabelTitle() {
  const store = useAppStore()
  const { selectedLabelId } = store.use.filter()
  const { items: labels } = store.use.labels()
  const label = labels.find((l) => l.id === selectedLabelId)
  return (
    <span className="flex items-center gap-2">
      {label && (
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: label.color }}
        />
      )}
      {label?.name ?? 'Label'}
    </span>
  )
}

function ProgressBar() {
  const store = useAppStore()
  const progress = store.use.progress()
  const totalCount = store.use.totalCount()
  const completedCount = store.use.completedCount()

  if (totalCount === 0) return null

  return (
    <>
      <Separator />
      <div className="flex items-center gap-3 px-6 py-2.5">
        <div className="flex-1 rounded-full bg-secondary h-1.5">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount} of {totalCount}
        </span>
      </div>
    </>
  )
}
