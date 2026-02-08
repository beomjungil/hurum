// @hurum/core — Undo/Redo Middleware

import type { Middleware } from '../middleware'

export interface UndoRedoOptions {
  maxHistory?: number
}

export interface UndoRedoHandle {
  middleware: Middleware
  undo: () => Record<string, unknown> | null
  redo: () => Record<string, unknown> | null
  canUndo: () => boolean
  canRedo: () => boolean
  getHistory: () => readonly Record<string, unknown>[]
  getPosition: () => number
}

/**
 * Undo/Redo middleware. Tracks state history for time-travel within the app.
 * Returns `undo()` and `redo()` functions that return the restored state.
 *
 * @example
 * ```ts
 * const history = undoRedo({ maxHistory: 30 })
 * const MyStore = Store({ ..., middleware: [history.middleware] })
 * // Later: const prevState = history.undo()
 * ```
 */
export function undoRedo(options?: UndoRedoOptions): UndoRedoHandle {
  const maxHistory = options?.maxHistory ?? 50

  const history: Record<string, unknown>[] = []
  let position = -1
  let tracking = true

  const middleware: Middleware = {
    name: 'undo-redo',
    onStateChange: (_prev, next) => {
      if (!tracking) return

      // Discard any future states after current position
      if (position < history.length - 1) {
        history.splice(position + 1)
      }

      // Add new state
      history.push(structuredClone(next))
      position = history.length - 1

      // Trim to max history
      if (history.length > maxHistory) {
        const excess = history.length - maxHistory
        history.splice(0, excess)
        position -= excess
      }
    },
  }

  function undo(): Record<string, unknown> | null {
    if (position <= 0) return null
    tracking = false
    position--
    const state = structuredClone(history[position]!)
    tracking = true
    return state
  }

  function redo(): Record<string, unknown> | null {
    if (position >= history.length - 1) return null
    tracking = false
    position++
    const state = structuredClone(history[position]!)
    tracking = true
    return state
  }

  function canUndo(): boolean {
    return position > 0
  }

  function canRedo(): boolean {
    return position < history.length - 1
  }

  function getHistory(): readonly Record<string, unknown>[] {
    return history
  }

  function getPosition(): number {
    return position
  }

  return { middleware, undo, redo, canUndo, canRedo, getHistory, getPosition }
}
