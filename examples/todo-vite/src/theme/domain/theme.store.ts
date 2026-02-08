import { Store } from '@hurum/core'
import { ThemeEvent } from './events/theme.events'
import { ThemeIntents } from './intents/theme.intents'
import { ToggleThemeExecutor } from './commands/toggle-theme/toggle-theme.command'
import type { ThemeDeps } from './types'

export const ThemeStore = Store({
  state: {
    dark: false,
  },
})
  .on(ThemeEvent, {
    toggled: (_state, { dark }) => ({ dark }),
  })
  .intents(ThemeIntents)
  .executors(ToggleThemeExecutor)
  .deps<ThemeDeps>()
