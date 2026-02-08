import { CommandExecutor } from '@hurum/core'
import { ThemeEvent } from '../../events/theme.events'
import type { ThemeDeps } from '../../types'

export const [ToggleThemeCommand, ToggleThemeExecutor] = CommandExecutor<{ dark: boolean }, ThemeDeps>(
  'ToggleTheme',
  async ({ dark }, { deps, emit }) => {
    deps.applyTheme(dark)
    emit(ThemeEvent.toggled({ dark }))
  },
)
