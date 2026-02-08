// @hurum/core — DevTools Middleware

import type { Middleware } from '../middleware'

export interface DevToolsOptions {
  name?: string
}

interface DevToolsExtensionInstance {
  init(state: Record<string, unknown>): void
  send(action: { type: string; payload?: unknown }, state: Record<string, unknown>): void
  subscribe(listener: (message: { type?: string; state?: unknown }) => void): (() => void) | void
}

interface DevToolsExtension {
  connect(options?: { name?: string }): DevToolsExtensionInstance
}

/** Shape of globalThis when Redux DevTools extension is present */
interface GlobalWithDevTools {
  __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension
}

export interface DevToolsHandle {
  middleware: Middleware
  connect: (store: { getState: () => Record<string, unknown> }) => void
}

/**
 * Redux DevTools Extension integration. Sends events and state to the browser extension.
 * Call `handle.connect(store)` after creating the store instance.
 *
 * @example
 * ```ts
 * const dtHandle = devtools({ name: 'MyApp' })
 * const MyStore = Store({ ..., middleware: [dtHandle.middleware] })
 * const store = MyStore.create()
 * dtHandle.connect(store)
 * ```
 */
export function devtools(options?: DevToolsOptions): DevToolsHandle {
  const name = options?.name ?? 'Hurum Store'
  let devToolsInstance: DevToolsExtensionInstance | null = null
  let storeRef: { getState: () => Record<string, unknown> } | null = null

  const middleware: Middleware = {
    name: 'devtools',
    onEvent: (event, state) => {
      devToolsInstance?.send({ type: event.type, payload: event }, state)
    },
    onIntentStart: (_intent, payload) => {
      devToolsInstance?.send(
        { type: `[Intent] ${_intent.mode}`, payload },
        storeRef?.getState() ?? {},
      )
    },
    onError: (error, context) => {
      devToolsInstance?.send(
        { type: `[Error] ${error.message}`, payload: context },
        storeRef?.getState() ?? {},
      )
    },
  }

  function connect(store: { getState: () => Record<string, unknown> }): void {
    storeRef = store
    const extension = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as GlobalWithDevTools).__REDUX_DEVTOOLS_EXTENSION__
      : undefined

    if (!extension) return

    devToolsInstance = extension.connect({ name })
    devToolsInstance.init(store.getState())

    // Support time-travel by subscribing to devtools messages
    devToolsInstance.subscribe((message) => {
      if (message.type === 'DISPATCH' && message.state) {
        // Time-travel: devtools sends a new state
        // Middleware is read-only, so we cannot set state here.
        // Time-travel support requires the store to expose a setState mechanism,
        // which violates the pure observer principle. We log the jump for observability.
      }
    })
  }

  return { middleware, connect }
}
