import { Intents, Intent } from '@hurum/core'
import { OpenPaletteCommand } from '../commands/open-palette.command'
import { ClosePaletteCommand } from '../commands/close-palette.command'
import { ExecuteCommandCommand } from '../commands/execute-command.command'

export const CommandPaletteIntents = Intents('CommandPalette', {
  open: Intent(OpenPaletteCommand),
  close: Intent(ClosePaletteCommand),
  execute: Intent(ExecuteCommandCommand),
})
