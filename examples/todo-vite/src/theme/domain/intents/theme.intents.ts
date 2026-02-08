import { Intents, Intent } from '@hurum/core'
import { ToggleThemeCommand } from '../commands/toggle-theme/toggle-theme.command'

export const ThemeIntents = Intents('Theme', {
  toggle: Intent(ToggleThemeCommand),
})
