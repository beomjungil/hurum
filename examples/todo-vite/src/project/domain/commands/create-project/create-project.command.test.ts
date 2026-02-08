import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { CreateProjectExecutor } from './create-project.command'
import { ProjectEvent } from '../../events/project.events'
import { ProjectRepositoryMemory } from '../../../data/repositories/project.repository.memory'

it('saves project to repo and emits created event', async () => {
  const repo = new ProjectRepositoryMemory()
  const executor = TestExecutor(CreateProjectExecutor, {
    deps: { projectRepo: repo },
  })

  await executor.run({ name: 'Work', color: '#2563eb' })

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(ProjectEvent.created.type)

  const saved = await repo.findAll()
  expect(saved).toHaveLength(1)
  expect(saved[0]!.name).toBe('Work')
})
