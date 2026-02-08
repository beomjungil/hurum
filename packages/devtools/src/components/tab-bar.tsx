import { theme } from '../styles/theme'

export type TabId = 'timeline' | 'state' | 'graph'

const TABS: { id: TabId; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'state', label: 'State' },
  { id: 'graph', label: 'Graph' },
]

interface TabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div style={theme.tabBar}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            ...theme.tab,
            ...(active === tab.id ? theme.tabActive : {}),
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
