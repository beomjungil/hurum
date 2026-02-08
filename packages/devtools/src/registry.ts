import type { DevtoolsHandle } from './types'

const handles: DevtoolsHandle[] = []
const listeners = new Set<() => void>()
let snapshot: readonly DevtoolsHandle[] = []

function notify(): void {
  snapshot = [...handles]
  for (const cb of listeners) cb()
}

export function registerHandle(handle: DevtoolsHandle): () => void {
  handles.push(handle)
  notify()
  return () => {
    const idx = handles.indexOf(handle)
    if (idx !== -1) handles.splice(idx, 1)
    notify()
  }
}

export function getRegisteredHandles(): readonly DevtoolsHandle[] {
  return snapshot
}

export function subscribeToRegistry(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
