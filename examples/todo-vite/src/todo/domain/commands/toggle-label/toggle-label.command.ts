import { CommandExecutor } from '@hurum/core'
import { TodoItemEvent } from '../../events/todo-item.events'

export interface ToggleLabelInput {
  id: string
  labelId: string
}

export const [ToggleLabelCommand, ToggleLabelExecutor] = CommandExecutor<ToggleLabelInput>(
  'ToggleLabel',
  async ({ id, labelId }, { emit, getState }) => {
    const state = getState() as { items: Array<{ id: string; labelIds: string[] }> }
    const todo = state.items.find((t) => t.id === id)
    if (!todo) return

    const labelIds = todo.labelIds.includes(labelId)
      ? todo.labelIds.filter((lid) => lid !== labelId)
      : [...todo.labelIds, labelId]

    emit(TodoItemEvent.updated({ id, labelIds }))
  },
)
