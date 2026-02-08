import { Events, Event } from '@hurum/core'
import type { Label } from '../entities/label'

export const LabelEvent = Events('Label', {
  created: Event<{ label: Label }>(),
  deleted: Event<{ id: string }>(),
  allLoaded: Event<{ labels: Label[] }>(),
  loadFailed: Event<{ error: string }>(),
})
