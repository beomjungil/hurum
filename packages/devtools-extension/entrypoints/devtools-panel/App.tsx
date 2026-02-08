import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import type { DevtoolsEntry } from '@hurum/devtools'
import {
  TabBar,
  type TabId,
  EventLogTab,
  StateInspectorTab,
  StoreGraphTab,
  HurumIcon,
  theme,
  colors,
  fontSize,
} from '@hurum/devtools/extension'
import { createRemoteHandle } from '../../src/remote-handle'
import type { HurumRuntimeMessage } from '../../src/protocol'

const handle = createRemoteHandle('Hurum DevTools')

function usePortEntries(): void {
  useEffect(() => {
    const tabId = browser.devtools.inspectedWindow.tabId
    const port = browser.runtime.connect({ name: `hurum-panel-${tabId}` })

    port.onMessage.addListener((message: HurumRuntimeMessage) => {
      if (message.type === 'HURUM_ENTRY') {
        handle.pushEntry(message.entry as DevtoolsEntry)
      }
    })

    return () => {
      port.disconnect()
    }
  }, [])
}

function useEntryCount(): number {
  return useSyncExternalStore(
    handle.subscribe,
    () => handle.getEntries().length,
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('timeline')
  usePortEntries()
  const entryCount = useEntryCount()

  const handleClear = useCallback(() => handle.clear(), [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100vh',
      background: theme.panelContainer.background,
      color: theme.panelContainer.color,
      fontFamily: theme.panelContainer.fontFamily,
      fontSize: theme.panelContainer.fontSize,
      lineHeight: theme.panelContainer.lineHeight,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={theme.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HurumIcon size={18} />
          <span style={theme.headerTitle}>Hurum DevTools</span>
        </div>
        <div style={theme.headerActions}>
          <span style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            {entryCount} entries
          </span>
          <button
            style={theme.iconButton}
            onClick={handleClear}
            title="Clear history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Content */}
      <div style={theme.content}>
        {activeTab === 'timeline' && <EventLogTab handle={handle} />}
        {activeTab === 'state' && <StateInspectorTab handle={handle} />}
        {activeTab === 'graph' && <StoreGraphTab handle={handle} />}
      </div>
    </div>
  )
}
