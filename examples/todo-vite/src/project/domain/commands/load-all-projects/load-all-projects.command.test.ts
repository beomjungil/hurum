import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { LoadAllProjectsExecutor } from './load-all-projects.command'
import { ProjectEvent } from '../../events/project.events'
import { ProjectRepositoryMemory } from '../../../data/repositories/project.repository.memory'

it('loads all projects and emits allLoaded', async () => {
  const repo = new ProjectRepositoryMemory()
  await repo.save({ id: 'p1', name: 'A', color: '#000', createdAt: 1000 })
  await repo.save({ id: 'p2', name: 'B', color: '#fff', createdAt: 2000 })

  const executor = TestExecutor(LoadAllProjectsExecutor, {
    deps: { projectRepo: repo },
  })

  await executor.run({})

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(ProjectEvent.allLoaded.type)
  expect((executor.emittedEvents[0] as unknown as { projects: unknown[] }).projects).toHaveLength(2)
})
