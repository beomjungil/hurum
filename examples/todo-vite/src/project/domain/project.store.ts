import { Store } from '@hurum/core'
import { ProjectEvent } from './events/project.events'

export const ProjectStore = Store({
  state: {
    id: '' as string,
    name: '' as string,
    color: '' as string,
    createdAt: 0,
  },
})
  .on(ProjectEvent, {
    updated: (state, payload) => ({
      ...state,
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.color !== undefined && { color: payload.color }),
    }),
  })
