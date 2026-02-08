import { describe, it, expectTypeOf } from 'vitest'
import { Events, Event } from './events'
import { CommandExecutor } from './command-executor'
import { Intents, Intent } from './intent'
import { Store } from './store'
import type { ResolvedState, ScopeOf, NestedArrayScope } from './store'
import { Nested } from './nested'

// ── Setup ─────────────────────────────────────────────────────────

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

const ItemStore = Store({
  state: { id: '', name: '', done: false },
})
  .on(ItemEvent, {
    renamed: (state, { name }) => ({ ...state, name }),
    toggled: (state) => ({ ...state, done: !state.done }),
  })
  .intents(Intents('Item', {
    rename: Intent(RenameCmd),
    toggle: Intent(ToggleCmd),
  }))
  .executors(RenameExec, ToggleExec)

// ── ResolvedState ─────────────────────────────────────────────────

describe('ResolvedState', () => {
  it('resolves Nested(ChildStore) to child state + computed', () => {
    const ChildDef = Store({ state: { name: 'default', done: false } })
      .computed({ label: (s) => `${s.name}:${s.done}` })

    type Raw = {
      child: ReturnType<typeof Nested<typeof ChildDef>>
      count: number
    }
    type Resolved = ResolvedState<Raw>

    expectTypeOf<Resolved['count']>().toEqualTypeOf<number>()
    expectTypeOf<Resolved['child']['name']>().toEqualTypeOf<string>()
    expectTypeOf<Resolved['child']['done']>().toEqualTypeOf<boolean>()
    expectTypeOf<Resolved['child']['label']>().toEqualTypeOf<string>()
  })

  it('resolves Nested.array to array type', () => {
    type Raw = {
      items: ReturnType<typeof Nested.array<typeof ItemStore>>
      title: string
    }
    type Resolved = ResolvedState<Raw>

    expectTypeOf<Resolved['title']>().toEqualTypeOf<string>()
    expectTypeOf<Resolved['items']>().toBeArray()
    expectTypeOf<Resolved['items'][number]['name']>().toEqualTypeOf<string>()
    expectTypeOf<Resolved['items'][number]['done']>().toEqualTypeOf<boolean>()
  })

  it('resolves Nested.map to Record type', () => {
    type Raw = {
      entries: ReturnType<typeof Nested.map<typeof ItemStore>>
      active: boolean
    }
    type Resolved = ResolvedState<Raw>

    expectTypeOf<Resolved['active']>().toEqualTypeOf<boolean>()
    expectTypeOf<Resolved['entries']>().toEqualTypeOf<
      Record<string, { id: string; name: string; done: boolean }>
    >()
  })

  it('plain fields stay as-is', () => {
    type Raw = { count: number; label: string }
    type Resolved = ResolvedState<Raw>
    expectTypeOf<Resolved>().toEqualTypeOf<{ count: number; label: string }>()
  })
})

// ── ScopeOf ──────────────────────────────────────────────────────

describe('ScopeOf', () => {
  it('maps nested keys to store instances with correct state', () => {
    const ChildDef = Store({ state: { val: 0 } })
    type RawState = {
      child: ReturnType<typeof Nested<typeof ChildDef>>
      items: ReturnType<typeof Nested.array<typeof ChildDef>>
      entries: ReturnType<typeof Nested.map<typeof ChildDef>>
      plain: number
    }
    type Scope = ScopeOf<RawState>

    // Nested single → StoreInstance with correct state properties
    type ChildState = ReturnType<Scope['child']['getState']>
    expectTypeOf<ChildState['val']>().toEqualTypeOf<number>()
    expectTypeOf<Scope['child']['dispose']>().toEqualTypeOf<() => void>()
    expectTypeOf<Scope['child']['send']>().toBeFunction()

    // Nested.array → NestedArrayScope
    expectTypeOf<Scope['items']>().toMatchTypeOf<NestedArrayScope>()
    type ItemInstance = NonNullable<ReturnType<Scope['items']['get']>>
    type ItemState = ReturnType<ItemInstance['getState']>
    expectTypeOf<ItemState['val']>().toEqualTypeOf<number>()

    // Nested.map → Map<string, StoreInstance>
    type EntryInstance = NonNullable<ReturnType<Scope['entries']['get']>>
    type EntryState = ReturnType<EntryInstance['getState']>
    expectTypeOf<EntryState['val']>().toEqualTypeOf<number>()
  })
})
