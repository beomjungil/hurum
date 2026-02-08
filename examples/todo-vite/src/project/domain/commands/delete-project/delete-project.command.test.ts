import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { DeleteProjectExecutor } from './delete-project.command'
import { ProjectEvent } from '../../events/project.events'
import { ProjectRepositoryMemory } from '../../../data/repositories/project.repository.memory'

it('removes project from repo and emits deleted', async () => {
  const repo = new ProjectRepositoryMemory()
  await repo.save({ id: 'p1', name: 'Work', color: '#000', createdAt: 1000 })

  const executor = TestExecutor(DeleteProjectExecutor, {
    deps: { projectRepo: repo },
  })

  await executor.run({ id: 'p1' })

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(ProjectEvent.deleted.type)

  const remaining = await repo.findAll()
  expect(remaining).toHaveLength(0)
})
