// @hurum/core — Logger Middleware

import type { EventInstance } from '../events'
import type { Middleware } from '../middleware'

export interface LoggerOptions {
  filter?: (event: EventInstance) => boolean
}

/**
 * Console logging middleware. Logs events, state changes, intents, and errors.
 *
 * @example
 * ```ts
 * Store({ ..., middleware: [logger({ filter: (e) => !e.type.startsWith('Timer/') })] })
 * ```
 */
export function logger(options?: LoggerOptions): Middleware {
  const filter = options?.filter

  return {
    name: 'logger',
    onEvent: (event, state) => {
      if (filter && !filter(event)) return
      console.group(`[Event] ${event.type}`)
      console.log(event)
      console.log('State:', state)
      console.groupEnd()
    },
    onStateChange: (prev, next) => {
      console.log('[State Change]', { prev, next })
    },
    onIntentStart: (intent, payload) => {
      console.log('[Intent Start]', intent, payload)
    },
    onIntentEnd: (intent, payload) => {
      console.log('[Intent End]', intent, payload)
    },
    onError: (error, context) => {
      console.error('[Error]', error, context)
    },
  }
}
