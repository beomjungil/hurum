import { describe, it, expect, vi } from 'vitest'
import { renderHook, render, act, screen } from '@testing-library/react'
import { useState, StrictMode, type ReactNode } from 'react'
import { Events, Event, CommandExecutor, Intents, Intent, Store, Nested } from '@hurum/core'
import { useStore } from './use-store'
import { StoreProvider } from './store-provider'
import { withProvider } from './with-provider'

// ── Test domain: Counter ────────────────────────────────────────────

const CounterEvent = Events('Counter', {
  incremented: Event<{ amount: number }>(),
  decremented: Event<{ amount: number }>(),
  reset: Event<{}>(),
})

const [IncrementCommand, IncrementExecutor] = CommandExecutor<{ amount: number }>((cmd, { emit }) => {
  emit(CounterEvent.incremented(cmd))
})
const [DecrementCommand, DecrementExecutor] = CommandExecutor<{ amount: number }>((cmd, { emit }) => {
  emit(CounterEvent.decremented(cmd))
})
const [ResetCommand, ResetExecutor] = CommandExecutor<{}>((cmd, { emit }) => {
  emit(CounterEvent.reset(cmd))
})

const CounterIntents = Intents('Counter', {
  plusClicked: Intent(IncrementCommand),
  minusClicked: Intent(DecrementCommand),
  resetClicked: Intent(ResetCommand),
})

function makeCounterStore() {
  return Store({
    state: {
      count: 0,
      name: 'counter',
    },
  })
    .on(CounterEvent, {
      incremented: (state, { amount }) => ({
        ...state,
        count: state.count + amount,
      }),
      decremented: (state, { amount }) => ({
        ...state,
        count: state.count - amount,
      }),
      reset: (state) => ({
        ...state,
        count: 0,
      }),
    })
    .computed({
      doubled: (state) => state.count * 2,
    })
    .intents(CounterIntents)
    .executors(IncrementExecutor, DecrementExecutor, ResetExecutor)
}

// ── Tests ───────────────────────────────────────────────────────────

describe('useStore(def)', () => {
  it('falls back to singleton when outside Provider', () => {
    const CounterStore = makeCounterStore()

    const { result } = renderHook(() => {
      const store = useStore(CounterStore)
      return store.use.count()
    })
    expect(result.current).toBe(0)
  })

  it('reads from Provider-scoped instance when inside StoreProvider', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create({ initialState: { count: 42 } })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={scopedInstance}>{children}</StoreProvider>
    )

    const { result } = renderHook(
      () => {
        const store = useStore(CounterStore)
        return store.use.count()
      },
      { wrapper },
    )
    expect(result.current).toBe(42)
    scopedInstance.dispose()
  })

  it('provides send() on the returned handle', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create()

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={scopedInstance}>{children}</StoreProvider>
    )

    const { result } = renderHook(
      () => {
        const store = useStore(CounterStore)
        return {
          count: store.use.count(),
          send: store.send,
        }
      },
      { wrapper },
    )

    expect(result.current.count).toBe(0)

    act(() => {
      result.current.send(CounterIntents.plusClicked, { amount: 10 })
    })
    expect(result.current.count).toBe(10)
    scopedInstance.dispose()
  })

  it('provides getState() on the returned handle', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create({ initialState: { count: 7 } })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={scopedInstance}>{children}</StoreProvider>
    )

    const { result } = renderHook(() => useStore(CounterStore), { wrapper })
    const state = result.current.getState()
    expect(state.count).toBe(7)
    expect(state.doubled).toBe(14)
    scopedInstance.dispose()
  })
})

describe('useStore(instance)', () => {
  it('uses given instance directly', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create({ initialState: { count: 33 } })

    const { result } = renderHook(() => {
      const store = useStore(instance)
      return store.use.count()
    })
    expect(result.current).toBe(33)
    instance.dispose()
  })

  it('reacts to state changes', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()

    const { result } = renderHook(() => {
      const store = useStore(instance)
      return store.use.count()
    })
    expect(result.current).toBe(0)

    act(() => {
      instance.send(CounterIntents.plusClicked, { amount: 5 })
    })
    expect(result.current).toBe(5)
    instance.dispose()
  })

  it('provides send/cancel/scope like def overload', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()

    const { result } = renderHook(() => useStore(instance))
    expect(result.current.send).toBeDefined()
    expect(result.current.cancel).toBeDefined()
    expect(result.current.cancelAll).toBeDefined()
    expect(result.current.scope).toBeDefined()
    expect(result.current.getState).toBeDefined()
    expect(result.current.dispose).toBeDefined()
    instance.dispose()
  })
})

describe('StoreProvider', () => {
  it('does NOT auto-dispose on unmount', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create()
    const disposeSpy = vi.spyOn(scopedInstance, 'dispose')

    const { unmount } = render(
      <StoreProvider of={CounterStore} store={scopedInstance}>
        <div>child</div>
      </StoreProvider>,
    )

    unmount()
    expect(disposeSpy).not.toHaveBeenCalled()
    scopedInstance.dispose()
  })

  it('isolates scoped instance from singleton', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create({ initialState: { count: 100 } })

    function Inner() {
      const store = useStore(CounterStore)
      return <div data-testid="count">{store.use.count()}</div>
    }

    render(
      <StoreProvider of={CounterStore} store={scopedInstance}>
        <Inner />
      </StoreProvider>,
    )

    expect(screen.getByTestId('count').textContent).toBe('100')
    scopedInstance.dispose()
  })

  it('auto-creates instance when no store prop', () => {
    const CounterStore = makeCounterStore()

    function Inner() {
      const store = useStore(CounterStore)
      return <div data-testid="count">{store.use.count()}</div>
    }

    render(
      <StoreProvider of={CounterStore}>
        <Inner />
      </StoreProvider>,
    )

    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('auto-creates instance with initialState', () => {
    const CounterStore = makeCounterStore()

    function Inner() {
      const store = useStore(CounterStore)
      return <div data-testid="count">{store.use.count()}</div>
    }

    render(
      <StoreProvider of={CounterStore} initialState={{ count: 77 }}>
        <Inner />
      </StoreProvider>,
    )

    expect(screen.getByTestId('count').textContent).toBe('77')
  })
})

describe('withProvider HOC', () => {
  it('wraps component with Provider using auto-created instance', () => {
    const CounterStore = makeCounterStore()

    function Inner() {
      const store = useStore(CounterStore)
      const count = store.use.count()
      return <div data-testid="count">{count}</div>
    }

    const Wrapped = withProvider(CounterStore, Inner)
    render(<Wrapped />)

    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('creates a fresh store instance on each mount', () => {
    const CounterStore = makeCounterStore()
    const states: Array<{ count: number; name: string; doubled: number }> = []

    function Inner() {
      const store = useStore(CounterStore)
      states.push(store.getState())
      return <div>ok</div>
    }

    const Wrapped = withProvider(CounterStore, Inner)

    const { unmount } = render(<Wrapped />)
    unmount()
    const { unmount: unmount2 } = render(<Wrapped />)

    // Both instances should have count=0 (fresh)
    expect(states[0]!.count).toBe(0)
    expect(states[1]!.count).toBe(0)
    unmount2()
  })
})

describe('Strict Mode compatibility', () => {
  it('double mount does not break state', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create({ initialState: { count: 5 } })

    function Inner() {
      const store = useStore(CounterStore)
      return <div data-testid="count">{store.use.count()}</div>
    }

    render(
      <StrictMode>
        <StoreProvider of={CounterStore} store={scopedInstance}>
          <Inner />
        </StoreProvider>
      </StrictMode>,
    )

    expect(screen.getByTestId('count').textContent).toBe('5')
    scopedInstance.dispose()
  })

  it('StoreProvider with useState does not break in Strict Mode', () => {
    const CounterStore = makeCounterStore()

    function Inner() {
      const store = useStore(CounterStore)
      return <div data-testid="count">{store.use.count()}</div>
    }

    function App() {
      const [store] = useState(() => CounterStore.create())
      return (
        <StoreProvider of={CounterStore} store={store}>
          <Inner />
        </StoreProvider>
      )
    }

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})

describe('SSR support', () => {
  it('getServerSnapshot returns correct state via StoreProvider + Store.create()', () => {
    const CounterStore = makeCounterStore()
    const serverInstance = CounterStore.create({ initialState: { count: 99 } })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={serverInstance}>{children}</StoreProvider>
    )

    const { result } = renderHook(
      () => {
        const store = useStore(CounterStore)
        return store.use.count()
      },
      { wrapper },
    )
    expect(result.current).toBe(99)
    serverInstance.dispose()
  })
})

describe('multiple stores', () => {
  it('each store definition gets its own context', () => {
    const Store1 = makeCounterStore()
    const Store2 = makeCounterStore()

    const instance1 = Store1.create({ initialState: { count: 10 } })
    const instance2 = Store2.create({ initialState: { count: 20 } })

    function Inner() {
      const s1 = useStore(Store1)
      const s2 = useStore(Store2)
      return (
        <div>
          <span data-testid="s1">{s1.use.count()}</span>
          <span data-testid="s2">{s2.use.count()}</span>
        </div>
      )
    }

    render(
      <StoreProvider of={Store1} store={instance1}>
        <StoreProvider of={Store2} store={instance2}>
          <Inner />
        </StoreProvider>
      </StoreProvider>,
    )

    expect(screen.getByTestId('s1').textContent).toBe('10')
    expect(screen.getByTestId('s2').textContent).toBe('20')
    instance1.dispose()
    instance2.dispose()
  })
})

describe('reactive updates', () => {
  it('re-renders only when subscribed field changes', () => {
    const CounterStore = makeCounterStore()
    const scopedInstance = CounterStore.create()
    let renderCount = 0

    function CountDisplay() {
      renderCount++
      const store = useStore(CounterStore)
      return <div data-testid="count">{store.use.count()}</div>
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={scopedInstance}>{children}</StoreProvider>
    )

    render(<CountDisplay />, { wrapper })
    const initialRenders = renderCount

    act(() => {
      scopedInstance.send(CounterIntents.plusClicked, { amount: 1 })
    })

    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(renderCount).toBeGreaterThan(initialRenders)
    scopedInstance.dispose()
  })
})

describe('useSelector', () => {
  it('reads derived state with inline function', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create({ initialState: { count: 3 } })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={instance}>{children}</StoreProvider>
    )

    const { result } = renderHook(
      () => {
        const store = useStore(CounterStore)
        return store.useSelector((s) => s.count * 10)
      },
      { wrapper },
    )
    expect(result.current).toBe(30)
    instance.dispose()
  })

  it('updates when derived value changes', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={instance}>{children}</StoreProvider>
    )

    const { result } = renderHook(
      () => {
        const store = useStore(CounterStore)
        return store.useSelector((s) => s.count + s.doubled)
      },
      { wrapper },
    )
    expect(result.current).toBe(0)

    act(() => {
      instance.send(CounterIntents.plusClicked, { amount: 5 })
    })
    // count=5, doubled=10 → 15
    expect(result.current).toBe(15)
    instance.dispose()
  })

  it('structural equality prevents re-render for same-value objects', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()
    let renderCount = 0

    function TestComponent() {
      renderCount++
      const store = useStore(CounterStore)
      const derived = store.useSelector((s) => ({ value: s.count }))
      return <div data-testid="value">{derived.value}</div>
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={instance}>{children}</StoreProvider>
    )

    render(<TestComponent />, { wrapper })
    const initialRenders = renderCount

    // Change name, not count → derived object is structurally equal → no re-render
    act(() => {
      instance.send(CounterIntents.resetClicked, {})
    })
    // count was already 0, reset sets to 0 → same derived value
    expect(renderCount).toBe(initialRenders)
    instance.dispose()
  })

  it('works with pre-built Selector object', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create({ initialState: { count: 7 } })
    const sel = instance.selector((s) => s.count * 3)

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={instance}>{children}</StoreProvider>
    )

    const { result } = renderHook(
      () => {
        const store = useStore(CounterStore)
        return store.useSelector(sel)
      },
      { wrapper },
    )
    expect(result.current).toBe(21)
    instance.dispose()
  })
})

// ── send API (PreparedIntent + shortcuts) ─────────────────────────

describe('send(PreparedIntent)', () => {
  it('useStore send accepts PreparedIntent', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={instance}>{children}</StoreProvider>
    )

    const { result } = renderHook(() => useStore(CounterStore), { wrapper })
    act(() => {
      const prepared = CounterIntents.plusClicked({ amount: 5 })
      result.current.send(prepared)
    })

    expect(instance.getState().count).toBe(5)
    instance.dispose()
  })

  it('useStore send.intentName() shorthand', () => {
    const CounterStore = makeCounterStore()
    const instance = CounterStore.create()

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StoreProvider of={CounterStore} store={instance}>{children}</StoreProvider>
    )

    const { result } = renderHook(() => useStore(CounterStore), { wrapper })
    act(() => {
      result.current.send.plusClicked({ amount: 9 })
    })

    expect(instance.getState().count).toBe(9)
    instance.dispose()
  })
})

// ── Nested store scoping ──────────────────────────────────────────

describe('nested store scoping', () => {
  const ItemEvent = Events('Item', {
    renamed: Event<{ id: string; name: string }>(),
  })

  const [RenameCmd, RenameExec] = CommandExecutor<{ id: string; name: string }>((cmd, { emit }) => {
    emit(ItemEvent.renamed(cmd))
  })

  const ItemIntents = Intents('Item', {
    renameClicked: Intent(RenameCmd),
  })

  const ItemStore = Store({
    state: { id: '', name: '', done: false },
  })
    .on(ItemEvent, {
      renamed: (state, { id, name }) => state.id === id ? { ...state, name } : state,
    })
    .intents(ItemIntents)
    .executors(RenameExec)

  const ParentEvent = Events('Parent', {
    titled: Event<{ title: string }>(),
  })

  const [TitleCmd, TitleExec] = CommandExecutor<{ title: string }>((cmd, { emit }) => {
    emit(ParentEvent.titled(cmd))
  })

  const ParentIntents = Intents('Parent', {
    titleClicked: Intent(TitleCmd),
  })

  const ParentStore = Store({
    state: {
      title: 'default',
      items: Nested.array(ItemStore),
    },
  })
    .on(ParentEvent, {
      titled: (state, { title }) => ({ ...state, title }),
    })
    .intents(ParentIntents)
    .executors(TitleExec)

  it('child component uses useStore(ChildDef) via StoreProvider', () => {
    const parent = ParentStore.create({
      initialState: {
        title: 'Test',
        items: [{ id: '1', name: 'Apple', done: false }],
      },
    })

    const firstChild = parent.scope.items.values()[0]!

    function ItemComponent() {
      const item = useStore(ItemStore)
      return <div data-testid="item-name">{item.use.name()}</div>
    }

    render(
      <StoreProvider of={ItemStore} store={firstChild}>
        <ItemComponent />
      </StoreProvider>,
    )

    expect(screen.getByTestId('item-name').textContent).toBe('Apple')
    parent.dispose()
  })

  it('useStore(instance) works for direct child store instance', () => {
    const parent = ParentStore.create({
      initialState: {
        title: 'Test',
        items: [{ id: '1', name: 'Banana', done: false }],
      },
    })

    const firstChild = parent.scope.items.values()[0]!

    function ItemComponent({ store }: { store: typeof firstChild }) {
      const item = useStore(store)
      return <div data-testid="item-name">{item.use.name()}</div>
    }

    render(<ItemComponent store={firstChild} />)
    expect(screen.getByTestId('item-name').textContent).toBe('Banana')
    parent.dispose()
  })
})
