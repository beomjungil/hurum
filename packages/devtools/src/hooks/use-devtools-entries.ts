import { useCallback, useSyncExternalStore } from 'react'
import type { DevtoolsHandle, DevtoolsEntry, DevtoolsTransaction } from '../types'

const emptyEntries: readonly DevtoolsEntry[] = []
const emptyTransactions: readonly DevtoolsTransaction[] = []
const noopUnsub = () => () => {}

export function useDevtoolsEntries(handle: DevtoolsHandle | null): readonly DevtoolsEntry[] {
  const subscribe = useCallback(
    (cb: () => void) => handle ? handle.subscribe(cb) : noopUnsub(),
    [handle],
  )
  const getSnapshot = useCallback(
    () => handle ? handle.getEntries() : emptyEntries,
    [handle],
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useDevtoolsTransactions(handle: DevtoolsHandle | null): readonly DevtoolsTransaction[] {
  const subscribe = useCallback(
    (cb: () => void) => handle ? handle.subscribe(cb) : noopUnsub(),
    [handle],
  )
  const getSnapshot = useCallback(
    () => handle ? handle.getTransactions() : emptyTransactions,
    [handle],
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
