import { describe, it, expect } from 'vitest'
import { CommandExecutor, isCommand, isExecutor, getCommandId, getExecutorCommand } from './command-executor'
import { Events, Event } from './events'
import { TestExecutor } from '../testing/test-executor'

const TestEvent = Events('Test', {
  happened: Event<{ value: number }>(),
})

describe('CommandExecutor', () => {
  it('returns a [Command, Executor] tuple', () => {
    const [cmd, exec] = CommandExecutor<{ value: number }>((command, { emit }) => {
      emit(TestEvent.happened({ value: command.value }))
    })

    expect(isCommand(cmd)).toBe(true)
    expect(isExecutor(exec)).toBe(true)
  })

  it('sets name from explicit string argument', () => {
    const [cmd] = CommandExecutor<{ value: number }>('EmitHappened', (command, { emit }) => {
      emit(TestEvent.happened({ value: command.value }))
    })

    expect(cmd.name).toBe('EmitHappened')
  })

  it('derives name from named function expression', () => {
    const [cmd] = CommandExecutor<{ value: number }>(function EmitHappened(command, { emit }) {
      emit(TestEvent.happened({ value: command.value }))
    })

    expect(cmd.name).toBe('EmitHappened')
  })

  it('has no name for arrow functions without explicit name', () => {
    const [cmd] = CommandExecutor<{ value: number }>((command, { emit }) => {
      emit(TestEvent.happened({ value: command.value }))
    })

    expect(cmd.name).toBeUndefined()
  })

  it('executor references its command', () => {
    const [cmd, exec] = CommandExecutor<{ value: number }>((command, { emit }) => {
      emit(TestEvent.happened({ value: command.value }))
    })

    expect(getExecutorCommand(exec)).toBe(cmd)
  })

  it('each CommandExecutor creates a unique command id', () => {
    const [cmd1] = CommandExecutor<{}>(() => {})
    const [cmd2] = CommandExecutor<{}>(() => {})

    expect(getCommandId(cmd1)).not.toBe(getCommandId(cmd2))
  })

  it('executor function can emit events synchronously', async () => {
    const [_cmd, exec] = CommandExecutor<{ value: number }>((command, { emit }) => {
      emit(TestEvent.happened({ value: command.value }))
    })

    const te = TestExecutor(exec)
    await te.run({ value: 42 })

    te.assertEmitted([TestEvent.happened({ value: 42 })])
  })

  it('executor function can be async', async () => {
    const [_cmd, exec] = CommandExecutor<{ value: number }>(async (command, { emit }) => {
      await Promise.resolve()
      emit(TestEvent.happened({ value: command.value }))
    })

    const te = TestExecutor(exec)
    await te.run({ value: 10 })

    te.assertEmitted([TestEvent.happened({ value: 10 })])
  })
})

