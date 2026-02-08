import { theme } from '../../styles/theme'
import type { DevtoolsEntryType } from '../../types'

export interface FilterState {
  search: string
  types: Set<DevtoolsEntryType>
}

interface FilterBarProps {
  filter: FilterState
  onSearchChange: (search: string) => void
  onTypeToggle: (type: DevtoolsEntryType) => void
}

const TYPE_LABELS: { type: DevtoolsEntryType; label: string }[] = [
  { type: 'event', label: 'Events' },
  { type: 'intent-start', label: 'Intents' },
  { type: 'error', label: 'Errors' },
  { type: 'state-change', label: 'State' },
]

export function FilterBar({ filter, onSearchChange, onTypeToggle }: FilterBarProps) {
  return (
    <div style={theme.filterBar}>
      <input
        style={{ ...theme.input, flex: 1 }}
        type="text"
        placeholder="Filter events..."
        value={filter.search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {TYPE_LABELS.map(({ type, label }) => (
        <button
          key={type}
          style={theme.filterChip(filter.types.has(type))}
          onClick={() => onTypeToggle(type)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
