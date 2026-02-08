import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { DeleteLabelExecutor } from './delete-label.command'
import { LabelEvent } from '../../events/label.events'
import { LabelRepositoryMemory } from '../../../data/repositories/label.repository.memory'

it('removes label from repo and emits deleted', async () => {
  const repo = new LabelRepositoryMemory()
  await repo.save({ id: 'l1', name: 'Work', color: '#000', createdAt: 1000 })

  const executor = TestExecutor(DeleteLabelExecutor, {
    deps: { labelRepo: repo },
  })

  await executor.run({ id: 'l1' })

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(LabelEvent.deleted.type)

  const remaining = await repo.findAll()
  expect(remaining).toHaveLength(0)
})
