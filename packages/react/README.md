# @hurum/react

> **Warning** — Hurum is in early development (`0.0.x`). APIs may change without notice. Do not use in production yet.

React bindings for [`@hurum/core`](https://www.npmjs.com/package/@hurum/core).

## Install

```bash
npm install @hurum/core @hurum/react
```

Requires React 18+.

## API

### `useStore(Definition)`

Access a store instance. Inside a `StoreProvider`, returns the scoped instance. Outside, falls back to a singleton.

```tsx
import { useStore } from '@hurum/react'

function Counter() {
  const store = useStore(CounterStore)
  return <button onClick={() => store.send.increment()}>
    {store.state.count}
  </button>
}
```

### `<StoreProvider>`

Provide a scoped store instance to a subtree.

```tsx
import { StoreProvider } from '@hurum/react'

<StoreProvider of={CounterStore}>
  <Counter />
</StoreProvider>

// or with options
<StoreProvider of={CounterStore} initialState={{ count: 10 }}>
  <Counter />
</StoreProvider>

// or with an existing instance
<StoreProvider of={CounterStore} store={myInstance}>
  <Counter />
</StoreProvider>
```

### `withProvider(Definition, Component)`

HOC that wraps a component with a `StoreProvider`.

```tsx
import { withProvider } from '@hurum/react'

const CounterPage = withProvider(CounterStore, Counter)
```

## Docs

[hurum.dev](https://hurum.dev)

## License

MIT
