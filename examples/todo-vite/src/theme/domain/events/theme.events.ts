import { Events, Event } from '@hurum/core'

export const ThemeEvent = Events('Theme', {
  toggled: Event<{ dark: boolean }>(),
})
