import { it, expect } from 'vitest'
import { TestStore } from '@hurum/core/testing'
import { LabelStore } from './label.store'
import { LabelRepositoryMemory } from '../data/repositories/label.repository.memory'

function createLabelStore() {
  return TestStore(LabelStore, { deps: { labelRepo: new LabelRepositoryMemory() } })
}

it('creates a label', async () => {
  const store = createLabelStore()
  await store.send.create({ name: 'Urgent', color: '#ef4444' })
  const state = store.getState()
  expect(state.items).toHaveLength(1)
  expect(state.items[0]!.name).toBe('Urgent')
  store.assertNoRunningExecutors()
})

it('deletes a label', async () => {
  const store = createLabelStore()
  await store.send.create({ name: 'Work', color: '#2563eb' })
  const id = store.getState().items[0]!.id
  await store.send.delete({ id })
  expect(store.getState().items).toHaveLength(0)
  store.assertNoRunningExecutors()
})

it('loads all labels from repo', async () => {
  const repo = new LabelRepositoryMemory()
  await repo.save({ id: 'l1', name: 'A', color: '#000', createdAt: 1000 })
  const store = TestStore(LabelStore, { deps: { labelRepo: repo } })
  await store.send.loadAll({})
  expect(store.getState().items).toHaveLength(1)
  store.assertNoRunningExecutors()
})
