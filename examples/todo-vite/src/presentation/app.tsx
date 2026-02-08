import { useState, useEffect, useCallback } from 'react'
import { StoreProvider } from '@hurum/react'
import { AppStore, AppIntents, getPersistedAppState } from '../app/domain'
import { HurumDevtools } from '@hurum/devtools'
import { TodoEvent } from '../todo/domain'
import { TodoItemEvent } from '../todo/domain/events/todo-item.events'
import { ProjectEvent } from '../project/domain'
import { LabelEvent } from '../label/domain'
import { TodoRepositoryLocal } from '../todo/data/repositories/todo.repository.local'
import { ProjectRepositoryLocal } from '../project/data/repositories/project.repository.local'
import { LabelRepositoryLocal } from '../label/data/repositories/label.repository.local'
import { AppLayout } from './layouts/app-layout'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export function App() {
  const [store] = useState(() => {
    const persisted = getPersistedAppState()
    return AppStore.create({
      ...(persisted ? { initialState: persisted } : {}),
      deps: {
        todoRepo: new TodoRepositoryLocal(),
        projectRepo: new ProjectRepositoryLocal(),
        labelRepo: new LabelRepositoryLocal(),
      },
    })
  })

  const handleEvent = useCallback((event: { type: string; error?: string }) => {
    switch (event.type) {
      case TodoEvent.created.type:
        toast.success('Task created')
        break
      case TodoEvent.deleted.type:
        toast('Task deleted')
        break
      case TodoEvent.validationFailed.type:
        toast.error(event.error ?? 'Validation failed')
        break
      case TodoItemEvent.updated.type:
        toast.success('Task updated')
        break
      case ProjectEvent.created.type:
        toast.success('Project created')
        break
      case ProjectEvent.deleted.type:
        toast('Project deleted')
        break
      case LabelEvent.created.type:
        toast.success('Label created')
        break
      case LabelEvent.deleted.type:
        toast('Label deleted')
        break
    }
  }, [])

  useEffect(() => {
    const unsubscribe = store.subscribe('events', handleEvent as (event: unknown) => void)
    return unsubscribe
  }, [store, handleEvent])

  useEffect(() => {
    store.send(AppIntents.appOpened({}))
  }, [store])

  useEffect(() => {
    return () => store.cancelAll()
  }, [store])

  return (
    <StoreProvider of={AppStore} store={store}>
      <AppLayout />
      <Toaster richColors position="bottom-right" />
      <HurumDevtools />
    </StoreProvider>
  )
}
