import { Events, Event } from '@hurum/core'

export const AppEvent = Events('App', {
  initialized: Event<{}>(),
})
