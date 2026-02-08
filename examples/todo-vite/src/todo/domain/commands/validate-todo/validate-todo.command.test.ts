import { it, expect } from 'vitest'
import { TestExecutor } from '@hurum/core/testing'
import { ValidateTodoExecutor } from './validate-todo.command'
import { TodoEvent } from '../../events/todo.events'

it('emits validated event for valid title', async () => {
  const executor = TestExecutor(ValidateTodoExecutor)
  await executor.run({ title: 'Buy milk', priority: 'p2', labelIds: [], dueDate: null })
  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.validated.type)
})

it('emits validationFailed and throws for empty title', async () => {
  const executor = TestExecutor(ValidateTodoExecutor)
  await expect(executor.run({ title: '   ' })).rejects.toThrow('Validation failed')
  expect(executor.emittedEvents).toHaveLength(1)
  expect(executor.emittedEvents[0]!.type).toBe(TodoEvent.validationFailed.type)
})

it('trims the title before emitting', async () => {
  const executor = TestExecutor(ValidateTodoExecutor)
  await executor.run({ title: '  Hello  ' })
  expect((executor.emittedEvents[0] as unknown as { title: string }).title).toBe('Hello')
})

it('defaults priority to p4 when not provided', async () => {
  const executor = TestExecutor(ValidateTodoExecutor)
  await executor.run({ title: 'Task' })
  expect((executor.emittedEvents[0] as unknown as { priority: string }).priority).toBe('p4')
})
