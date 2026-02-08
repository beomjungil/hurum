import { useState, type CSSProperties } from 'react'
import type { DevtoolsHandle } from '../types'
import { theme } from '../styles/theme'
import { colors, zIndex } from '../styles/tokens'
import { TabBar, type TabId } from './tab-bar'
import { EventLogTab } from './event-log/event-log-tab'
import { StateInspectorTab } from './state-inspector/state-inspector-tab'
import { StoreGraphTab } from './store-graph/store-graph-tab'
import { HurumIcon } from './hurum-icon'
import { useResize, type PanelPosition } from '../hooks/use-resize'

interface PanelShellProps {
  handle: DevtoolsHandle
  handles: readonly DevtoolsHandle[]
  selectedIndex: number
  onSelectStore: (index: number) => void
  onClose: () => void
  position?: PanelPosition
  onPositionChange?: (position: PanelPosition) => void
}

function getPanelStyle(position: PanelPosition, size: number): CSSProperties {
  const base: CSSProperties = {
    position: 'fixed',
    background: theme.panelContainer.background,
    color: theme.panelContainer.color,
    fontFamily: theme.panelContainer.fontFamily,
    fontSize: theme.panelContainer.fontSize,
    lineHeight: theme.panelContainer.lineHeight,
    zIndex: zIndex.panel,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  switch (position) {
    case 'right':
      return {
        ...base,
        top: 0,
        right: 0,
        width: `${size}px`,
        height: '100vh',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5)',
        borderLeft: `1px solid ${colors.border}`,
      }
    case 'left':
      return {
        ...base,
        top: 0,
        left: 0,
        width: `${size}px`,
        height: '100vh',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
        borderRight: `1px solid ${colors.border}`,
      }
    case 'bottom':
      return {
        ...base,
        bottom: 0,
        left: 0,
        right: 0,
        height: `${size}px`,
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5)',
        borderTop: `1px solid ${colors.border}`,
      }
  }
}

function getResizeHandleStyle(position: PanelPosition): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    zIndex: 1,
  }

  switch (position) {
    case 'right':
      return {
        ...base,
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        cursor: 'col-resize',
      }
    case 'left':
      return {
        ...base,
        top: 0,
        right: 0,
        width: '4px',
        height: '100%',
        cursor: 'col-resize',
      }
    case 'bottom':
      return {
        ...base,
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        cursor: 'row-resize',
      }
  }
}

const storeSelectorStyle: CSSProperties = {
  background: colors.bgEntry,
  border: `1px solid ${colors.border}`,
  borderRadius: '4px',
  color: colors.text,
  fontSize: '11px',
  padding: '2px 4px',
  outline: 'none',
  cursor: 'pointer',
  maxWidth: '140px',
}

const ICON_SIZE = 14

const POSITIONS: PanelPosition[] = ['left', 'bottom', 'right']

function DockIcon({ position }: { position: PanelPosition }) {
  const s = ICON_SIZE
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (position) {
    case 'left':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
    case 'bottom':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
    case 'right':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
  }
}

function ClearIcon() {
  return <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
}

function CloseIcon() {
  return <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

export function PanelShell({
  handle,
  handles,
  selectedIndex,
  onSelectStore,
  onClose,
  position = 'right',
  onPositionChange,
}: PanelShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>('timeline')
  const { size, onMouseDown } = useResize(position)

  const showSelector = handles.length > 1

  return (
    <div style={getPanelStyle(position, size)}>
      {/* Resize handle */}
      <div
        style={getResizeHandleStyle(position)}
        onMouseDown={onMouseDown}
      />

      {/* Header */}
      <div style={theme.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HurumIcon size={18} />
          {showSelector ? (
            <select
              style={storeSelectorStyle}
              value={selectedIndex}
              onChange={(e) => onSelectStore(Number(e.target.value))}
            >
              {handles.map((h, i) => (
                <option key={i} value={i}>
                  {h.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={theme.headerTitle}>{handle.name}</span>
          )}
        </div>
        <div style={theme.headerActions}>
          <button
            style={theme.iconButton}
            onClick={() => handle.clear()}
            title="Clear history"
          >
            <ClearIcon />
          </button>
          {onPositionChange && (
            <div style={{ display: 'flex', gap: '1px' }}>
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  style={{
                    ...theme.iconButton,
                    opacity: pos === position ? 1 : 0.4,
                  }}
                  onClick={() => onPositionChange(pos)}
                  title={`Dock to ${pos}`}
                >
                  <DockIcon position={pos} />
                </button>
              ))}
            </div>
          )}
          <button
            style={theme.iconButton}
            onClick={onClose}
            title="Close (Ctrl+Shift+D)"
          >
            <CloseIcon />
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
