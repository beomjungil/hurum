import { CommandExecutor } from '@hurum/core'
import { CommandPaletteEvent } from '../events/command-palette.events'

export const [ExecuteCommandCommand, ExecuteCommandExecutor] = CommandExecutor<{
  commandId: string
}>('ExecuteCommand', ({ commandId }, { emit }) => {
  emit(CommandPaletteEvent.commandExecuted({ commandId }))
  emit(CommandPaletteEvent.closed({}))
})
