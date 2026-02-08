import { describe, it, expect, vi } from 'vitest'
import { Events, Event } from './events'
import type { EventInstance } from './events'
import { CommandExecutor } from './command-executor'
import { Intents, Intent } from './intent'
import { Store, NestedMeta } from './store'
import type { StoreInstance } from './store'
import { Nested } from './nested'

// ── Child Store: Item ──────────────────────────────────────────────

const ItemEvent = Events('Item', {
  renamed: Event<{ name: string }>(),
  toggled: Event<{}>(),
})

const [RenameCmd, RenameExec] = CommandExecutor<{ name: string }>((cmd, { emit }) => {
  emit(ItemEvent.renamed(cmd))
})
const [ToggleCmd, ToggleExec] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(ItemEvent.toggled(cmd))
})

const ItemIntents = Intents('Item', {
  rename: Intent(RenameCmd),
  toggle: Intent(ToggleCmd),
})

const ItemStore = Store({
  state: { id: '', name: '', done: false },
})
  .on(ItemEvent, {
    renamed: (state, { name }) => ({ ...state, name }),
    toggled: (state) => ({ ...state, done: !state.done }),
  })
  .intents(ItemIntents)
  .executors(RenameExec, ToggleExec)

// ── Child Store: Currency ──────────────────────────────────────────

const CurrencyEvent = Events('Currency', {
  rateUpdated: Event<{ rate: number }>(),
})

const [UpdateRateCmd, UpdateRateExec] = CommandExecutor<{ rate: number }>((cmd, { emit }) => {
  emit(CurrencyEvent.rateUpdated(cmd))
})

const CurrencyIntents = Intents('Currency', {
  updateRate: Intent(UpdateRateCmd),
})

const CurrencyStore = Store({
  state: { code: '', rate: 0 },
})
  .on(CurrencyEvent.rateUpdated, (state, { rate }) => ({ ...state, rate }))
  .intents(CurrencyIntents)
  .executors(UpdateRateExec)

// ── Child Store with Deps ──────────────────────────────────────────

const DepChildEvent = Events('DepChild', {
  loaded: Event<{ data: string }>(),
})

const [DepChildCmd, DepChildExec] = CommandExecutor<
  {},
  { service: { getData: () => string } }
>((_, { deps, emit }) => {
  const data = deps.service.getData()
  emit(DepChildEvent.loaded({ data }))
})

const DepChildIntents = Intents('DepChild', {
  load: Intent(DepChildCmd),
})

const DepChildStore = Store({ state: { data: '' } })
  .deps<{ service: { getData: () => string } }>()
  .on(DepChildEvent.loaded, (state, { data }) => ({ ...state, data }))
  .intents(DepChildIntents)
  .executors(DepChildExec)

// ── Parent Store Events ────────────────────────────────────────────

const ParentEvent = Events('Parent', {
  childAdded: Event<{ id: string; name: string }>(),
  childRemoved: Event<{ id: string }>(),
  mapEntryAdded: Event<{ key: string; code: string; rate: number }>(),
  mapEntryRemoved: Event<{ key: string }>(),
})

const [AddChildCmd, AddChildExec] = CommandExecutor<{ id: string; name: string }>((cmd, { emit }) => {
  emit(ParentEvent.childAdded(cmd))
})
const [RemoveChildCmd, RemoveChildExec] = CommandExecutor<{ id: string }>((cmd, { emit }) => {
  emit(ParentEvent.childRemoved(cmd))
})
const [AddMapCmd, AddMapExec] = CommandExecutor<{ key: string; code: string; rate: number }>((cmd, { emit }) => {
  emit(ParentEvent.mapEntryAdded(cmd))
})
const [RemoveMapCmd, RemoveMapExec] = CommandExecutor<{ key: string }>((cmd, { emit }) => {
  emit(ParentEvent.mapEntryRemoved(cmd))
})

const ParentIntents = Intents('Parent', {
  addChild: Intent(AddChildCmd),
  removeChild: Intent(RemoveChildCmd),
  addMapEntry: Intent(AddMapCmd),
  removeMapEntry: Intent(RemoveMapCmd),
})

// ── Helper type for nested array/map state access ──────────────────

type ItemState = { id: string; name: string; done: boolean }
type CurrencyState = { code: string; rate: number }

// ── Tests: Nested Single ───────────────────────────────────────────

describe('Nested (single)', () => {
  it('creates child store instance and includes state in getCombinedState', () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .create()

    const state = parent.getState()
    expect(state.title).toBe('parent')
    expect(state.child).toBeDefined()
    expect(state.child.name).toBe('')
    expect(state.child.done).toBe(false)
    parent.dispose()
  })

  it('exposes child instance via scope', () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .create()

    const childInstance = parent.scope.child
    expect(childInstance).toBeDefined()
    expect(childInstance.getState().name).toBe('')
    parent.dispose()
  })

  it('child state changes bubble up to parent state', async () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .create()

    const childInstance = parent.scope.child
    childInstance.send(ItemIntents.rename, { name: 'renamed-item' })
    await new Promise((r) => setTimeout(r, 0))

    expect(parent.getState().child.name).toBe('renamed-item')
    parent.dispose()
  })

  it('child events bubble up to parent event listeners', async () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .create()

    const events: EventInstance[] = []
    parent.subscribe('events', (e) => events.push(e))

    const childInstance = parent.scope.child
    childInstance.send(ItemIntents.toggle, {})
    await new Promise((r) => setTimeout(r, 0))

    expect(events.some((e) => e.type === 'Item/toggled')).toBe(true)
    parent.dispose()
  })

  it('parent state subscribers notified on child change', async () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .create()

    const states: Array<ReturnType<typeof parent.getState>> = []
    parent.subscribe((s) => states.push(s))

    const childInstance = parent.scope.child
    childInstance.send(ItemIntents.rename, { name: 'new-name' })
    await new Promise((r) => setTimeout(r, 0))

    expect(states.length).toBeGreaterThan(0)
    expect(states[states.length - 1]!.child.name).toBe('new-name')
    parent.dispose()
  })

  it('dispose propagates to child', () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .create()

    const childInstance = parent.scope.child
    parent.dispose()

    expect(() => {
      childInstance.send(ItemIntents.rename, { name: 'fail' })
    }).toThrow()
  })

  it('supports per-child deps via childDeps builder', async () => {
    const mockService = { getData: vi.fn(() => 'child-data') }

    const parent = Store({
      state: {
        depChild: Nested(DepChildStore),
      },
    })
      .deps<{ childService: { getData: () => string } }>()
      .childDeps('depChild', (parentDeps) => ({
        service: parentDeps.childService,
      }))
      .create({ deps: { childService: mockService } })

    const childInstance = parent.scope.depChild
    childInstance.send(DepChildIntents.load, {})
    await new Promise((r) => setTimeout(r, 0))

    expect(mockService.getData).toHaveBeenCalled()
    expect(parent.getState().depChild.data).toBe('child-data')
    parent.dispose()
  })
})

// ── Tests: Nested.array ────────────────────────────────────────────

describe('Nested.array', () => {
  it('creates child instances from initial state array', () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create({
        initialState: {
          items: [
            { id: '1', name: 'Item 1', done: false },
            { id: '2', name: 'Item 2', done: true },
          ] as ItemState[],
        },
      })

    const state = parent.getState()
    expect(state.items).toHaveLength(2)
    expect(state.items[0]!.name).toBe('Item 1')
    expect(state.items[1]!.name).toBe('Item 2')
    expect(state.items[1]!.done).toBe(true)
    parent.dispose()
  })

  it('exposes child instances via scope as array', () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create({
        initialState: {
          items: [
            { id: '1', name: 'A', done: false },
            { id: '2', name: 'B', done: false },
          ] as ItemState[],
        },
      })

    const children = parent.scope.items
    expect(children.size).toBe(2)
    expect(children.values()[0]!.getState().name).toBe('A')
    parent.dispose()
  })

  it('child state changes reflect in parent getCombinedState', async () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create({
        initialState: {
          items: [
            { id: '1', name: 'Before', done: false },
          ] as ItemState[],
        },
      })

    const child = parent.scope.items.values()[0]!
    child.send(ItemIntents.rename, { name: 'After' })
    await new Promise((r) => setTimeout(r, 0))

    expect(parent.getState().items[0]!.name).toBe('After')
    parent.dispose()
  })

  it('state-driven diffing: adds new child when parent on-handler adds item', async () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .on(ParentEvent.childAdded, (state, { id, name }) => ({
        ...state,
        items: [...state.items, { id, name, done: false }],
      }))
      .intents(ParentIntents)
      .executors(AddChildExec, RemoveChildExec)
      .create()

    expect(parent.scope.items.size).toBe(0)

    parent.send(ParentIntents.addChild, { id: 'x', name: 'New' })
    await new Promise((r) => setTimeout(r, 10))

    expect(parent.scope.items.size).toBe(1)
    expect(parent.scope.items.values()[0]!.getState().name).toBe('New')
    parent.dispose()
  })

  it('state-driven diffing: removes child when parent on-handler removes item', async () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .on(ParentEvent.childRemoved, (state, { id }) => ({
        ...state,
        items: state.items.filter((i: ItemState) => i.id !== id),
      }))
      .intents(ParentIntents)
      .executors(RemoveChildExec)
      .create({
        initialState: {
          items: [
            { id: '1', name: 'Keep', done: false },
            { id: '2', name: 'Remove', done: false },
          ] as ItemState[],
        },
      })

    expect(parent.scope.items.size).toBe(2)

    parent.send(ParentIntents.removeChild, { id: '2' })
    await new Promise((r) => setTimeout(r, 10))

    expect(parent.scope.items.size).toBe(1)
    expect(parent.getState().items).toHaveLength(1)
    expect(parent.getState().items[0]!.name).toBe('Keep')
    parent.dispose()
  })

  it('removed child store is disposed', async () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .on(ParentEvent.childRemoved, (state, { id }) => ({
        ...state,
        items: state.items.filter((i: ItemState) => i.id !== id),
      }))
      .intents(ParentIntents)
      .executors(RemoveChildExec)
      .create({
        initialState: {
          items: [
            { id: '1', name: 'A', done: false },
          ] as ItemState[],
        },
      })

    const child = parent.scope.items.values()[0]!

    parent.send(ParentIntents.removeChild, { id: '1' })
    await new Promise((r) => setTimeout(r, 10))

    expect(() => {
      child.send(ItemIntents.rename, { name: 'fail' })
    }).toThrow()
    parent.dispose()
  })

  it('child events bubble up to parent', async () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create({
        initialState: {
          items: [{ id: '1', name: 'X', done: false }] as ItemState[],
        },
      })

    const events: EventInstance[] = []
    parent.subscribe('events', (e) => events.push(e))

    const child = parent.scope.items.values()[0]!
    child.send(ItemIntents.toggle, {})
    await new Promise((r) => setTimeout(r, 0))

    expect(events.some((e) => e.type === 'Item/toggled')).toBe(true)
    parent.dispose()
  })

  it('dispose propagates to all array children', () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create({
        initialState: {
          items: [
            { id: '1', name: 'A', done: false },
            { id: '2', name: 'B', done: false },
          ] as ItemState[],
        },
      })

    const children = parent.scope.items
    parent.dispose()

    for (const child of children) {
      expect(() => {
        child.send(ItemIntents.rename, { name: 'fail' })
      }).toThrow()
    }
  })

  it('attaches __nestedMeta with source info to child instances', () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create({
        initialState: {
          items: [{ id: '1', name: 'X', done: false }] as ItemState[],
        },
      })

    const child = parent.scope.items.values()[0]!
    const meta = (child as StoreInstance & { __nestedMeta?: NestedMeta }).__nestedMeta!
    expect(meta).toBeDefined()
    expect(meta.source.parentKey).toBe('items')
    expect(meta.source.index).toBe(0)
    expect(typeof meta.source.instanceId).toBe('string')
    parent.dispose()
  })
})

// ── Tests: Nested.map ──────────────────────────────────────────────

describe('Nested.map', () => {
  it('creates child instances from initial state map', () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
            EUR: { code: 'EUR', rate: 0.85 },
          } as Record<string, CurrencyState>,
        },
      })

    const state = parent.getState()
    expect(state.currencies['USD']!.rate).toBe(1.0)
    expect(state.currencies['EUR']!.rate).toBe(0.85)
    parent.dispose()
  })

  it('exposes child instances via scope as Map', () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
          } as Record<string, CurrencyState>,
        },
      })

    const scopeMap = parent.scope.currencies
    expect(scopeMap instanceof Map).toBe(true)
    expect(scopeMap.size).toBe(1)
    expect(scopeMap.get('USD')!.getState().rate).toBe(1.0)
    parent.dispose()
  })

  it('child state changes reflect in parent getCombinedState', async () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
          } as Record<string, CurrencyState>,
        },
      })

    const usdInstance = parent.scope.currencies.get('USD')!
    usdInstance.send(CurrencyIntents.updateRate, { rate: 1.05 })
    await new Promise((r) => setTimeout(r, 0))

    expect(parent.getState().currencies['USD']!.rate).toBe(1.05)
    parent.dispose()
  })

  it('state-driven diffing: adds new entry', async () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .on(ParentEvent.mapEntryAdded, (state, { key, code, rate }) => ({
        ...state,
        currencies: {
          ...state.currencies,
          [key]: { code, rate },
        },
      }))
      .intents(ParentIntents)
      .executors(AddMapExec)
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
          } as Record<string, CurrencyState>,
        },
      })

    expect(parent.scope.currencies.size).toBe(1)

    parent.send(ParentIntents.addMapEntry, { key: 'GBP', code: 'GBP', rate: 0.73 })
    await new Promise((r) => setTimeout(r, 10))

    expect(parent.scope.currencies.size).toBe(2)
    expect(parent.scope.currencies.get('GBP')!.getState().rate).toBe(0.73)
    parent.dispose()
  })

  it('state-driven diffing: removes entry and disposes child', async () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .on(ParentEvent.mapEntryRemoved, (state, { key }) => {
        const currencies = { ...state.currencies }
        delete currencies[key]
        return { ...state, currencies }
      })
      .intents(ParentIntents)
      .executors(RemoveMapExec)
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
            EUR: { code: 'EUR', rate: 0.85 },
          } as Record<string, CurrencyState>,
        },
      })

    const eurInstance = parent.scope.currencies.get('EUR')!

    parent.send(ParentIntents.removeMapEntry, { key: 'EUR' })
    await new Promise((r) => setTimeout(r, 10))

    expect(parent.scope.currencies.size).toBe(1)
    expect(parent.scope.currencies.has('EUR')).toBe(false)

    expect(() => {
      eurInstance.send(CurrencyIntents.updateRate, { rate: 999 })
    }).toThrow()
    parent.dispose()
  })

  it('child events bubble up to parent', async () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
          } as Record<string, CurrencyState>,
        },
      })

    const events: EventInstance[] = []
    parent.subscribe('events', (e) => events.push(e))

    const usd = parent.scope.currencies.get('USD')!
    usd.send(CurrencyIntents.updateRate, { rate: 1.1 })
    await new Promise((r) => setTimeout(r, 0))

    expect(events.some((e) => e.type === 'Currency/rateUpdated')).toBe(true)
    parent.dispose()
  })

  it('dispose propagates to all map children', () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
            EUR: { code: 'EUR', rate: 0.85 },
          } as Record<string, CurrencyState>,
        },
      })

    const usd = parent.scope.currencies.get('USD')!
    const eur = parent.scope.currencies.get('EUR')!
    parent.dispose()

    expect(() => usd.send(CurrencyIntents.updateRate, { rate: 0 })).toThrow()
    expect(() => eur.send(CurrencyIntents.updateRate, { rate: 0 })).toThrow()
  })
})

// ── Tests: Per-child deps ──────────────────────────────────────────

describe('Nested per-child deps', () => {
  it('Nested.array passes deps from parent via childDeps builder', async () => {
    const mockService = { getData: vi.fn(() => 'array-child-data') }

    const parent = Store({
      state: {
        children: Nested.array(DepChildStore),
      },
    })
      .deps<{ childService: { getData: () => string } }>()
      .childDeps('children', (parentDeps) => ({
        service: parentDeps.childService,
      }))
      .create({
        initialState: {
          children: [{ id: '1', data: '' }] as Array<{ id: string; data: string }>,
        },
        deps: { childService: mockService },
      })

    const child = parent.scope.children.values()[0]!
    child.send(DepChildIntents.load, {})
    await new Promise((r) => setTimeout(r, 0))

    expect(mockService.getData).toHaveBeenCalled()
    expect(parent.getState().children[0]!.data).toBe('array-child-data')
    parent.dispose()
  })

  it('Nested.map passes deps from parent via childDeps builder', async () => {
    const mockService = { getData: vi.fn(() => 'map-child-data') }

    const parent = Store({
      state: {
        entries: Nested.map(DepChildStore),
      },
    })
      .deps<{ childService: { getData: () => string } }>()
      .childDeps('entries', (parentDeps) => ({
        service: parentDeps.childService,
      }))
      .create({
        initialState: {
          entries: { main: { data: '' } } as Record<string, { data: string }>,
        },
        deps: { childService: mockService },
      })

    const child = parent.scope.entries.get('main')!
    child.send(DepChildIntents.load, {})
    await new Promise((r) => setTimeout(r, 0))

    expect(mockService.getData).toHaveBeenCalled()
    expect(parent.getState().entries['main']!.data).toBe('map-child-data')
    parent.dispose()
  })
})

// ── Tests: Empty initial state ─────────────────────────────────────

describe('Nested with no initial state', () => {
  it('Nested.array starts empty without initial state', () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .create()

    expect(parent.getState().items).toEqual([])
    expect(parent.scope.items.size).toBe(0)
    parent.dispose()
  })

  it('Nested.map starts empty without initial state', () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .create()

    expect(parent.getState().currencies).toEqual({})
    expect(parent.scope.currencies.size).toBe(0)
    parent.dispose()
  })
})

// ── Tests: Computed accessing child state ──────────────────────────

describe('Computed accessing nested child state', () => {
  it('Nested (single): computed reads child state', () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .computed({
        childName: (state) => state.child?.name ?? '',
      })
      .create()

    expect(parent.getState().childName).toBe('')
    parent.dispose()
  })

  it('Nested (single): computed updates when child state changes', async () => {
    const parent = Store({
      state: {
        title: 'parent',
        child: Nested(ItemStore),
      },
    })
      .computed({
        childName: (state) => state.child?.name ?? '',
        childDone: (state) => state.child?.done ?? false,
      })
      .create()

    parent.scope.child.send(ItemIntents.rename, { name: 'hello' })
    await new Promise((r) => setTimeout(r, 0))

    expect(parent.getState().childName).toBe('hello')
    expect(parent.getState().childDone).toBe(false)
    parent.dispose()
  })

  it('Nested.array: computed reads child states', async () => {
    const parent = Store({
      state: {
        items: Nested.array(ItemStore),
      },
    })
      .on(ParentEvent.childAdded, (state, { id, name }) => ({
        ...state,
        items: [...state.items, { id, name, done: false }],
      }))
      .computed({
        totalItems: (state) => state.items.length,
        doneCount: (state) =>
          state.items.filter((item: ItemState) => item.done).length,
      })
      .intents(ParentIntents)
      .executors(AddChildExec)
      .create()

    expect(parent.getState().totalItems).toBe(0)

    parent.send(ParentIntents.addChild, { id: '1', name: 'Task A' })
    await new Promise((r) => setTimeout(r, 10))

    expect(parent.getState().totalItems).toBe(1)
    expect(parent.getState().doneCount).toBe(0)

    // Toggle child item
    parent.scope.items.values()[0]!.send(ItemIntents.toggle, {})
    await new Promise((r) => setTimeout(r, 0))

    expect(parent.getState().doneCount).toBe(1)
    parent.dispose()
  })

  it('Nested.map: computed reads child states', async () => {
    const parent = Store({
      state: {
        currencies: Nested.map(CurrencyStore),
      },
    })
      .computed({
        currencyCount: (state) =>
          state.currencies ? Object.keys(state.currencies).length : 0,
        totalRate: (state) =>
          state.currencies
            ? Object.values(state.currencies as Record<string, CurrencyState>).reduce(
                (sum: number, c) => sum + (c.rate ?? 0),
                0,
              )
            : 0,
      })
      .create({
        initialState: {
          currencies: {
            USD: { code: 'USD', rate: 1.0 },
            EUR: { code: 'EUR', rate: 0.85 },
          } as Record<string, CurrencyState>,
        },
      })

    expect(parent.getState().currencyCount).toBe(2)
    expect(parent.getState().totalRate).toBeCloseTo(1.85)

    // Update child
    parent.scope.currencies.get('EUR')!.send(CurrencyIntents.updateRate, { rate: 0.90 })
    await new Promise((r) => setTimeout(r, 0))

    expect(parent.getState().totalRate).toBeCloseTo(1.90)
    parent.dispose()
  })

  it('cross-nested computed: parent computed accesses multiple children', async () => {
    const parent = Store({
      state: {
        child: Nested(ItemStore),
        items: Nested.array(ItemStore),
        currencies: Nested.map(CurrencyStore),
      },
    })
      .on(ParentEvent.childAdded, (state, { id, name }) => ({
        ...state,
        items: [...state.items, { id, name, done: false }],
      }))
      .on(ParentEvent.mapEntryAdded, (state, { key, code, rate }) => ({
        ...state,
        currencies: {
          ...state.currencies,
          [key]: { code, rate },
        },
      }))
      .computed({
        summary: (state) => ({
          singleName: state.child?.name ?? '',
          arrayCount: state.items.length,
          mapCount: state.currencies ? Object.keys(state.currencies).length : 0,
        }),
      })
      .intents(ParentIntents)
      .executors(AddChildExec, AddMapExec)
      .create()

    const s = parent.getState().summary
    expect(s.singleName).toBe('')
    expect(s.arrayCount).toBe(0)
    expect(s.mapCount).toBe(0)

    // Modify single child
    parent.scope.child.send(ItemIntents.rename, { name: 'hello' })
    await new Promise((r) => setTimeout(r, 0))
    expect(parent.getState().summary.singleName).toBe('hello')

    parent.dispose()
  })
})

// ── Type-level tests ──────────────────────────────────────────────

