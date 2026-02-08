import { CommandExecutor } from '@hurum/core'
import type { StoreInstance, IntentDescriptor } from '@hurum/core'
import { AppEvent } from '../../app.events'
import { ProjectEvent } from '../../../../project/domain/events/project.events'
import { TodoIntents } from '../../../../todo/domain/intents/todo.intents'
import { LabelIntents } from '../../../../label/domain/intents/label.intents'
import type { ProjectRepository } from '../../../../project/domain/repository/project.repository'

/**
 * InitializeApp — orchestrates parallel loading of all aggregates.
 *
 * Demonstrates: scope access in executor for delegating to nested child stores.
 * - Todo loading: delegated to TodoStore (Nested single) via scope.todo
 * - Label loading: delegated to LabelStore (Nested single) via scope.labels
 * - Project loading: handled directly (AppStore manages Nested.map collection)
 */
export const [InitializeAppCommand, InitializeAppExecutor] = CommandExecutor<
  Record<string, never>,
  { projectRepo: ProjectRepository }
>('InitializeApp', async (_command, { deps, emit, scope, signal }) => {
  // Load all aggregates in parallel
  await Promise.all([
    // Delegate to child stores via scope
    sendAndFlush(scope as Record<string, StoreInstance>, 'todo', TodoIntents.loadAll, {}),
    sendAndFlush(scope as Record<string, StoreInstance>, 'labels', LabelIntents.loadAll, {}),
    // Load projects directly (AppStore owns the Nested.map collection)
    deps.projectRepo.findAll().then((projects) => {
      if (!signal.aborted) {
        emit(ProjectEvent.allLoaded({ projects }))
      }
    }),
  ])

  if (signal.aborted) return
  emit(AppEvent.initialized({}))
})

/** Send an intent to a store and flush microtasks for async executor completion. */
async function sendAndFlush<TInput>(
  scope: Record<string, StoreInstance>,
  key: string,
  intent: IntentDescriptor<TInput>,
  payload: TInput,
): Promise<void> {
  const store = scope[key] as StoreInstance
  store.send(intent, payload)
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}
