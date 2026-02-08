import { forwardRef } from 'react'
import { useAppStore } from '../hooks/use-app-store'
import { TodoList, type TodoListHandle } from './todo-list'
import { Badge } from '@/components/ui/badge'
import { CalendarDays } from 'lucide-react'

export const TodayView = forwardRef<TodoListHandle>(function TodayView(_props, ref) {
  const store = useAppStore()
  const todayTodos = store.use.todayTodos()

  return (
    <div className="flex flex-col h-full">
      {todayTodos.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-3 bg-primary/5 border-b">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {todayTodos.length} task{todayTodos.length !== 1 ? 's' : ''} due today
          </span>
          <Badge variant="secondary" className="ml-auto">
            {todayTodos.length}
          </Badge>
        </div>
      )}
      <TodoList ref={ref} />
    </div>
  )
})
