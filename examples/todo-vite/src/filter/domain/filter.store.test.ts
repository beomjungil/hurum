import { describe, it, expect } from 'vitest'
import { TestReducer, TestIntent } from '@hurum/core/testing'
import { FilterStore } from './filter.store'
import { FilterEvent } from './events/filter.events'
import { FilterIntents } from './intents/filter.intents'

describe('FilterStore — TestReducer', () => {
  const reducer = TestReducer(FilterStore)

  const defaultState = {
    view: 'inbox' as const,
    selectedProjectId: null,
    selectedLabelId: null,
    showCompleted: false,
    priorityFilter: null,
  }

  it('viewChanged updates view and project/label ids', () => {
    const next = reducer.apply(
      defaultState,
      FilterEvent.viewChanged({ view: 'project', projectId: 'p1', labelId: null }),
    )
    expect(next.view).toBe('project')
    expect(next.selectedProjectId).toBe('p1')
    expect(next.selectedLabelId).toBeNull()
  })

  it('viewChanged to label sets selectedLabelId', () => {
    const next = reducer.apply(
      defaultState,
      FilterEvent.viewChanged({ view: 'label', projectId: null, labelId: 'l1' }),
    )
    expect(next.view).toBe('label')
    expect(next.selectedLabelId).toBe('l1')
  })

  it('showCompletedToggled toggles the flag', () => {
    const next = reducer.apply(defaultState, FilterEvent.showCompletedToggled({ showCompleted: true }))
    expect(next.showCompleted).toBe(true)

    const back = reducer.apply(next, FilterEvent.showCompletedToggled({ showCompleted: false }))
    expect(back.showCompleted).toBe(false)
  })

  it('priorityFilterChanged sets and clears priority', () => {
    const next = reducer.apply(defaultState, FilterEvent.priorityFilterChanged({ priority: 'p1' }))
    expect(next.priorityFilter).toBe('p1')

    const cleared = reducer.apply(next, FilterEvent.priorityFilterChanged({ priority: null }))
    expect(cleared.priorityFilter).toBeNull()
  })

  it('unrelated event returns state unchanged', () => {
    const fakeEvent = { type: 'Unknown/event' }
    const next = reducer.apply(defaultState, fakeEvent as any)
    expect(next).toBe(defaultState)
  })
})

describe('FilterIntents — TestIntent', () => {
  it('changeView has single command in sequential mode', () => {
    const intent = TestIntent(FilterIntents.changeView)
    expect(intent.steps).toHaveLength(1)
    expect(intent.mode).toBe('sequential')
  })

  it('toggleCompleted has single command', () => {
    const intent = TestIntent(FilterIntents.toggleCompleted)
    expect(intent.steps).toHaveLength(1)
  })

  it('changePriority has single command', () => {
    const intent = TestIntent(FilterIntents.changePriority)
    expect(intent.steps).toHaveLength(1)
  })
})
