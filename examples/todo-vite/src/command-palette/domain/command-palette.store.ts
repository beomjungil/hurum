import { Store } from '@hurum/core'
import { CommandPaletteEvent } from './events/command-palette.events'
import { CommandPaletteIntents } from './intents/command-palette.intents'
import { OpenPaletteExecutor } from './commands/open-palette.command'
import { ClosePaletteExecutor } from './commands/close-palette.command'
import { ExecuteCommandExecutor } from './commands/execute-command.command'

const MAX_RECENT = 5

export const CommandPaletteStore = Store({
  state: {
    isOpen: false,
    recentCommandIds: [] as string[],
  },
})
  .on(CommandPaletteEvent, {
    opened: (state) => ({
      ...state,
      isOpen: true,
    }),

    closed: (state) => ({
      ...state,
      isOpen: false,
    }),

    commandExecuted: (state, { commandId }) => ({
      ...state,
      recentCommandIds: [
        commandId,
        ...state.recentCommandIds.filter((id) => id !== commandId),
      ].slice(0, MAX_RECENT),
    }),
  })
  .intents(CommandPaletteIntents)
  .executors(OpenPaletteExecutor, ClosePaletteExecutor, ExecuteCommandExecutor)
