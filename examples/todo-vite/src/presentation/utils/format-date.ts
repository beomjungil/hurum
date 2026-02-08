export function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return 'Today'

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
