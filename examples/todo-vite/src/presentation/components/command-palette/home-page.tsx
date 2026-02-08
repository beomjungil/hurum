import { useMemo } from 'react'
import type { CommandItem as CommandItemType } from '../../../command-palette/domain'
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Inbox,
  CalendarDays,
  Hash,
  Tag,
  Plus,
  Eye,
  Flag,
  X,
  FolderPlus,
  Zap,
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  inbox: Inbox,
  calendar: CalendarDays,
  hash: Hash,
  tag: Tag,
  plus: Plus,
  eye: Eye,
  flag: Flag,
  x: X,
  'folder-plus': FolderPlus,
}

const groupLabels: Record<string, string> = {
  navigation: 'Navigation',
  action: 'Actions',
  filter: 'Filter',
  create: 'Create',
}

interface HomePageProps {
  commands: CommandItemType[]
  onSelect: (command: CommandItemType) => void
}

export function HomePage({ commands, onSelect }: HomePageProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItemType[]> = {}
    for (const cmd of commands) {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category]!.push(cmd)
    }
    return groups
  }, [commands])

  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      {Object.entries(grouped).map(([category, items]) => (
        <CommandGroup key={category} heading={groupLabels[category] ?? category}>
          {items.map((cmd) => {
            const Icon = iconMap[cmd.icon ?? ''] ?? Zap
            return (
              <CommandItem
                key={cmd.id}
                value={cmd.id}
                keywords={cmd.keywords}
                onSelect={() => onSelect(cmd)}
              >
                <Icon className="h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      ))}
    </>
  )
}
