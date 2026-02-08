import { CommandExecutor } from '@hurum/core'
import { CommandPaletteEvent } from '../events/command-palette.events'

export const [ClosePaletteCommand, ClosePaletteExecutor] = CommandExecutor<{}>(
  'ClosePalette', (_payload, { emit }) => {
    emit(CommandPaletteEvent.closed({}))
  },
)
