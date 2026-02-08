# @hurum/core

> **Warning** — Hurum is in early development (`0.0.x`). APIs may change without notice. Do not use in production yet.

Predictable state management for TypeScript where every state change follows one path:

```
Intent -> Command -> Executor -> Event -> Store.on
```

A counter increment and a complex async API call with retries and error handling go through the exact same pipeline. No shortcuts. No special cases.

## Install

```bash
npm install @hurum/core
```

## Quick Example

```ts
import { Events, Event, Store } from '@hurum/core'

const CounterEvent = Events('Counter', {
  incremented: Event<{ amount: number }>(),
  reset: Event<{}>(),
})

const CounterStore = Store({ state: { count: 0 } })
  .on(CounterEvent, {
    incremented: (state, { amount }) => ({ ...state, count: state.count + amount }),
    reset: () => ({ count: 0 }),
  })
```

## Features

- **Single path** — All state changes flow through Intent -> Command -> Executor -> Event -> Store.on
- **Framework-agnostic** — Zero runtime dependencies, works anywhere TypeScript runs
- **Type-safe** — Full TypeScript inference for state, events, commands, and computed values
- **Testable** — Built-in `@hurum/core/testing` utilities for unit testing stores
- **Nested stores** — Parent-child store composition with event forwarding and bubbling
- **Middleware** — Logger, devtools, persist, undo-redo
- **CJS + ESM** — Dual build, tree-shakeable

## Docs

[hurum.dev](https://hurum.dev)

## License

MIT
