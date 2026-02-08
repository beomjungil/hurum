<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/brand/logo-light.svg">
    <img alt="Hurum" src="./assets/brand/logo-light.svg" width="420">
  </picture>
</p>

<p align="center">
  TypeScript를 위한 예측 가능한 상태 머신.<br>
  모든 상태 변경이 하나의 경로를 따라요.
</p>

<p align="center">
  <a href="https://hurum.dev/ko/">문서</a> · <a href="https://hurum.dev">English</a>
</p>

> **경고** — Hurum은 초기 개발 단계(`0.0.x`)입니다. API가 예고 없이 변경될 수 있습니다. 프로덕션에서 사용하지 마세요.

## 설치

```bash
pnpm add @hurum/core @hurum/react
```

## 빠른 예제

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

## 데이터 흐름

```
Intent → Command → CommandExecutor → emit(Event) → Store.on → Computed → 구독자 알림
```

동기든 비동기든, 단순하든 복잡하든 — 모든 상태 변경이 이 경로를 따라요.

## 패키지

| 패키지 | 설명 |
|--------|------|
| `@hurum/core` | 핵심 상태 관리. 프레임워크 무관, 의존성 제로. |
| `@hurum/react` | React 바인딩: `useStore`, `StoreProvider`, `Store.use.*`, `withProvider`. |
| `@hurum/devtools` | 시각적 devtools: 인앱 패널 및 Chrome 확장 프로그램. |

## 문서

가이드, API 레퍼런스, 예제를 포함한 전체 문서:

**[hurum.dev/ko](https://hurum.dev/ko/)**

## 라이선스

MIT
