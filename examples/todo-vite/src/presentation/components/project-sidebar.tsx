import { forwardRef, useImperativeHandle } from 'react'
import { useStore } from '@hurum/react'
import { useAppStore } from '../hooks/use-app-store'
import { ProjectIntents } from '../../project/domain'
import { LabelIntents } from '../../label/domain'
import { FilterIntents } from '../../filter/domain'
import type { ViewType } from '../../filter/domain/entities/filter'
import { SidebarFormStore, SidebarFormIntents } from '../stores/sidebar-form.store'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Inbox, CalendarDays, Plus, Trash2, Hash, Tag } from 'lucide-react'

const PROJECT_COLORS = [
  '#dc2626', '#ea580c', '#d97706', '#65a30d',
  '#059669', '#0891b2', '#2563eb', '#7c3aed',
  '#c026d3', '#e11d48',
]

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

export interface ProjectSidebarHandle {
  openNewProject(): void
  openNewLabel(): void
}

export const ProjectSidebar = forwardRef<ProjectSidebarHandle>(function ProjectSidebar(_props, ref) {
  const store = useAppStore()
  const formStore = useStore(SidebarFormStore)
  const showNewProject = formStore.use.showNewProject()
  const showNewLabel = formStore.use.showNewLabel()
  const newProjectName = formStore.use.newProjectName()
  const newProjectColor = formStore.use.newProjectColor()
  const newLabelName = formStore.use.newLabelName()
  const newLabelColor = formStore.use.newLabelColor()
  const { view, selectedProjectId, selectedLabelId, showCompleted } = store.use.filter()
  const projectsList = store.use.projectsList()
  const { items: labelsList } = store.use.labels()
  const todayTodos = store.use.todayTodos()

  useImperativeHandle(ref, () => ({
    openNewProject() {
      formStore.send(SidebarFormIntents.openProjectDialog({}))
    },
    openNewLabel() {
      formStore.send(SidebarFormIntents.openLabelDialog({}))
    },
  }))

  const handleChangeView = (v: ViewType, projectId?: string, labelId?: string) => {
    store.send(FilterIntents.changeView({
      view: v,
      projectId: projectId ?? null,
      labelId: labelId ?? null,
    }))
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    store.send(ProjectIntents.create({
      name: newProjectName.trim(),
      color: newProjectColor,
    }))
    formStore.send(SidebarFormIntents.resetProjectForm({}))
  }

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) return
    store.send(LabelIntents.create({
      name: newLabelName.trim(),
      color: newLabelColor,
    }))
    formStore.send(SidebarFormIntents.resetLabelForm({}))
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <HurumIcon className="h-7 w-7 shrink-0" />
          <h2 className="text-lg font-bold tracking-tight">Hurum Todo</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1">
          {/* Navigation */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'inbox'}
                    onClick={() => handleChangeView('inbox')}
                  >
                    <Inbox className="h-4 w-4" />
                    <span>Inbox</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === 'today'}
                    onClick={() => handleChangeView('today')}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span>Today</span>
                    {todayTodos.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5">
                        {todayTodos.length}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator className="mx-4" />

          {/* Projects */}
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupAction onClick={() => formStore.send(SidebarFormIntents.openProjectDialog({}))} title="Add project">
              <Plus className="h-4 w-4" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectsList.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      isActive={view === 'project' && selectedProjectId === project.id}
                      onClick={() => handleChangeView('project', project.id)}
                    >
                      <Hash className="h-4 w-4" style={{ color: project.color }} />
                      <span>{project.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => store.send(ProjectIntents.delete({ id: project.id }))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
                {projectsList.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Labels */}
          <SidebarGroup>
            <SidebarGroupLabel>Labels</SidebarGroupLabel>
            <SidebarGroupAction onClick={() => formStore.send(SidebarFormIntents.openLabelDialog({}))} title="Add label">
              <Plus className="h-4 w-4" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {labelsList.map((label) => (
                  <SidebarMenuItem key={label.id}>
                    <SidebarMenuButton
                      isActive={view === 'label' && selectedLabelId === label.id}
                      onClick={() => handleChangeView('label', undefined, label.id)}
                    >
                      <Tag className="h-4 w-4" style={{ color: label.color }} />
                      <span>{label.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={() => store.send(LabelIntents.delete({ id: label.id }))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
                {labelsList.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No labels yet</p>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={() =>
              store.send(FilterIntents.toggleCompleted({ showCompleted: !showCompleted }))
            }
          />
          <label htmlFor="show-completed" className="text-sm cursor-pointer select-none">
            Show completed
          </label>
        </div>
      </SidebarFooter>

      {/* Create Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={(open) => {
        if (!open) formStore.send(SidebarFormIntents.closeProjectDialog({}))
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={newProjectName}
              onChange={(e) => formStore.send(SidebarFormIntents.setProjectName({ name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder="Project name"
              autoFocus
            />
            <div className="flex gap-1.5 flex-wrap">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => formStore.send(SidebarFormIntents.setProjectColor({ color }))}
                  className={`h-6 w-6 rounded-full transition-all ${
                    newProjectColor === color
                      ? 'ring-2 ring-ring ring-offset-2'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => formStore.send(SidebarFormIntents.closeProjectDialog({}))}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Label Dialog */}
      <Dialog open={showNewLabel} onOpenChange={(open) => {
        if (!open) formStore.send(SidebarFormIntents.closeLabelDialog({}))
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={newLabelName}
              onChange={(e) => formStore.send(SidebarFormIntents.setLabelName({ name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
              placeholder="Label name"
              autoFocus
            />
            <div className="flex gap-1.5 flex-wrap">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => formStore.send(SidebarFormIntents.setLabelColor({ color }))}
                  className={`h-6 w-6 rounded-full transition-all ${
                    newLabelColor === color
                      ? 'ring-2 ring-ring ring-offset-2'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => formStore.send(SidebarFormIntents.closeLabelDialog({}))}>
              Cancel
            </Button>
            <Button onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SidebarRail />
    </Sidebar>
  )
})

function HurumIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="90 90 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M365.705 590.91C355.997 592.086 343.292 591.641 333.585 591.111C278.773 588.023 226.476 567.097 184.672 531.52C142.641 496.265 108.539 441.505 103.77 386.006C100.125 338.562 115.232 291.579 145.85 255.146C175.042 220.959 216.61 199.747 261.429 196.168C318.814 191.501 379.458 216.585 396.807 275.141C400.122 286.332 400.939 294.716 401.865 306.394C380.994 275.116 349.203 257.549 311.492 259.691C253.762 268.073 233.346 324.507 240.937 376.486C248.315 424.093 274.332 466.811 313.25 495.22C353.249 524.875 403.322 537.575 452.626 530.571C498.043 523.817 530.748 503.527 563.508 472.555C528.012 529.232 471.645 569.674 406.57 585.147C394.15 588.059 378.642 590.125 365.705 590.91Z" fill="#0084FF"/>
      <path d="M365.705 590.91C361.963 588.303 348.478 587.548 343.116 586.591C237.391 567.737 154.406 456.94 187.544 350.23C203.003 300.452 247.298 263.152 299.618 259.134C303.002 258.878 308.397 258.506 311.673 259.053L311.492 259.691C253.762 268.073 233.346 324.507 240.937 376.486C248.316 424.093 274.332 466.811 313.25 495.22C353.249 524.875 403.322 537.575 452.626 530.571C498.043 523.817 530.748 503.527 563.508 472.555C528.012 529.232 471.645 569.674 406.57 585.147C394.151 588.059 378.642 590.125 365.705 590.91Z" fill="currentColor"/>
      <path d="M330.955 100.554C386.083 96.3467 437.782 116.454 481.029 149.099C564.757 212.306 540.23 347.855 430.591 360.284C443.918 326.963 447.032 294.539 435.174 260.22C422.432 223.366 395.406 195.304 360.714 178.299C358.24 177.108 355.736 175.978 353.207 174.91C309.713 156.508 262.081 158.373 218.664 176.087C176.337 193.638 140.818 224.396 117.403 263.774C110.897 274.741 104.966 287.99 100 299.772C107.419 256.754 126.787 216.688 155.892 184.148C201.703 132.482 262.426 104.586 330.955 100.554Z" fill="#0084FF"/>
      <path d="M591.479 308.062L592.381 305.422L592.972 305.421C594.873 309.17 596.652 326.094 596.896 330.694C597.524 335.118 597.304 341.005 597.243 345.513C596.451 409.181 555.611 464.781 496.745 488.564C457.495 504.461 413.529 504.078 374.559 487.498C334.907 470.942 303.548 439.182 287.505 399.328C277.343 373.852 265.729 323.176 299.33 310.13C304.335 325.015 307.629 334.071 315.581 347.666C336.059 382.907 369.721 408.553 409.141 418.943C447.325 428.927 485.886 422.722 519.804 402.871C555.306 382.001 581.089 347.906 591.479 308.062Z" fill="#0084FF"/>
    </svg>
  )
}
