import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { LoadAllLabelsExecutor } from './load-all-labels.command'
import { LabelEvent } from '../../events/label.events'
import { LabelRepositoryMemory } from '../../../data/repositories/label.repository.memory'

it('loads all labels and emits allLoaded', async () => {
  const repo = new LabelRepositoryMemory()
  await repo.save({ id: 'l1', name: 'A', color: '#000', createdAt: 1000 })
  await repo.save({ id: 'l2', name: 'B', color: '#fff', createdAt: 2000 })

  const executor = TestExecutor(LoadAllLabelsExecutor, {
    deps: { labelRepo: repo },
  })

  await executor.run({})

  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(LabelEvent.allLoaded.type)
  expect((executor.emittedEvents[0] as unknown as { labels: unknown[] }).labels).toHaveLength(2)
})
