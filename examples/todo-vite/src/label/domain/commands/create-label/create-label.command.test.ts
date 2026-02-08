import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { CreateLabelExecutor } from './create-label.command'
import { LabelEvent } from '../../events/label.events'
import { LabelRepositoryMemory } from '../../../data/repositories/label.repository.memory'

it('saves label to repo and emits created event', async () => {
  const repo = new LabelRepositoryMemory()
  const executor = TestExecutor(CreateLabelExecutor, {
    deps: { labelRepo: repo },
  })

  await executor.run({ name: 'Urgent', color: '#ef4444' })

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(LabelEvent.created.type)

  const saved = await repo.findAll()
  expect(saved).toHaveLength(1)
  expect(saved[0]!.name).toBe('Urgent')
})
