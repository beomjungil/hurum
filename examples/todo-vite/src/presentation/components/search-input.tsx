import { useRef, useCallback } from 'react'
import { useAppStore } from '../hooks/use-app-store'
import { TodoIntents } from '../../todo/domain'
import type { IntentRef } from '@hurum/core'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchInput() {
  const store = useAppStore()
  const lastSearchRef = useRef<IntentRef | null>(null)

  const handleSearch = useCallback(
    (query: string) => {
      if (lastSearchRef.current) {
        store.cancel(lastSearchRef.current)
      }

      if (!query.trim()) {
        lastSearchRef.current = store.send(TodoIntents.search({ query: '' }))
        return
      }

      lastSearchRef.current = store.send(TodoIntents.search({ query }))
    },
    [store],
  )

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search tasks..."
        className="w-56 pl-8 h-8"
      />
    </div>
  )
}
