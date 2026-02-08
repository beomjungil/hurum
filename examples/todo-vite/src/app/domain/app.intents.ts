import { Intents, Intent } from '@hurum/core'
import { InitializeAppCommand } from './commands/initialize-app/initialize-app.command'

export const AppIntents = Intents('App', {
  appOpened: Intent(InitializeAppCommand),
})
