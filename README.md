<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/brand/logo-light.svg">
    <img alt="Hurum" src="./assets/brand/logo-light.svg" width="420">
  </picture>
</p>

<p align="center">
  Predictable state machines for TypeScript.<br>
  Every state change follows one path.
</p>

<p align="center">
  <a href="https://hurum.dev">Documentation</a> · <a href="https://hurum.dev/ko/">한국어</a>
</p>

> **Warning** — Hurum is in early development (`0.0.x`). APIs may change without notice. Do not use in production yet.

## Install

```bash
pnpm add @hurum/core @hurum/react
```

## Quick Example

```ts
import { Store, Events, Event, CommandExecutor, Intents, Intent } from '@hurum/core'

const CounterEvent = Events('Counter', {
  incremented: Event<{ amount: number }>(),
})

const [IncrementCommand, IncrementExecutor] = CommandExecutor<
  { amount: number }
>((command, { emit }) => {
  emit(CounterEvent.incremented(command))
})

const CounterIntents = Intents('Counter', {
  plusClicked: Intent(IncrementCommand),
})

const CounterStore = Store({ state: { count: 0 } })
  .on(CounterEvent, {
    incremented: (state, { amount }) => ({ ...state, count: state.count + amount }),
  })
  .computed({ doubled: (state) => state.count * 2 })
  .intents(CounterIntents)
  .executors(IncrementExecutor)
```

```tsx
function Counter() {
  const count = CounterStore.use.count()
  const doubled = CounterStore.use.doubled()

  return (
    <div>
      <p>{count} (doubled: {doubled})</p>
      <button onClick={() => CounterStore.send.plusClicked({ amount: 1 })}>+1</button>
    </div>
  )
}
```

## Data Flow

```
Intent → Command → CommandExecutor → emit(Event) → Store.on → Computed → Subscribers
```

Every state change — sync or async, simple or complex — follows this exact path.

## Packages

| Package | Description |
|---------|-------------|
| `@hurum/core` | Core state management. Framework-agnostic, zero dependencies. |
| `@hurum/react` | React bindings: `useStore`, `StoreProvider`, `Store.use.*`, `withProvider`. |
| `@hurum/devtools` | Visual devtools: in-app panel and Chrome extension. |

## Documentation

Full documentation with guides, API reference, and examples:

**[hurum.dev](https://hurum.dev)**

## License

MIT
