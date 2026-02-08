import { CommandExecutor } from '@hurum/core'
import { CommandPaletteEvent } from '../events/command-palette.events'

export const [OpenPaletteCommand, OpenPaletteExecutor] = CommandExecutor<{}>(
  'OpenPalette', (_payload, { emit }) => {
    emit(CommandPaletteEvent.opened({}))
  },
)
