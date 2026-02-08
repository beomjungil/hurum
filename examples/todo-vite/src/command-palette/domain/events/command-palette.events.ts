import { Events, Event } from '@hurum/core'

export const CommandPaletteEvent = Events('CommandPalette', {
  opened: Event<{}>(),
  closed: Event<{}>(),
  commandExecuted: Event<{ commandId: string }>(),
})
