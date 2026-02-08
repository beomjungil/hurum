import type { DevtoolsEntry } from '@hurum/devtools'

/** Messages sent from page → content script via window.postMessage */
export interface HurumPageMessage {
  source: 'hurum-devtools'
  type: 'HURUM_ENTRY'
  entry: DevtoolsEntry
}

/** Messages sent via chrome.runtime between content ↔ background ↔ panel */
export type HurumRuntimeMessage =
  | { type: 'HURUM_ENTRY'; tabId: number; entry: DevtoolsEntry }
  | { type: 'HURUM_STATE'; tabId: number; state: Record<string, unknown> }
  | { type: 'HURUM_CLEAR'; tabId: number }
  | { type: 'HURUM_INIT'; tabId: number; name: string }

export function isHurumPageMessage(data: unknown): data is HurumPageMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as HurumPageMessage).source === 'hurum-devtools' &&
    (data as HurumPageMessage).type === 'HURUM_ENTRY'
  )
}
