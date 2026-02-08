// @hurum/core — CommandExecutor

import type { EventInstance } from './events'

// Branding symbols
const COMMAND_BRAND = Symbol('hurum/command')
const EXECUTOR_BRAND = Symbol('hurum/executor')

/** A branded command type. Commands are identified by their unique symbol. */
export interface Command<TInput = unknown> {
  readonly [COMMAND_BRAND]: symbol
  readonly name?: string
  readonly __inputType?: TInput
}

/** Context provided to executor functions */
export interface ExecutorContext<TDeps = unknown, TState = unknown> {
  readonly deps: TDeps
  readonly emit: (event: EventInstance) => void
  readonly getState: () => TState
  readonly signal: AbortSignal
  /** Access nested child store instances. Available when the store has Nested fields. */
  readonly scope: Record<string, unknown>
}

/** The executor function type */
export type ExecutorFn<TInput, TDeps, TState> = (
  command: TInput,
  context: ExecutorContext<TDeps, TState>,
) => void | Promise<void>

/** An executor registered with a Store.
 *  __fn is type-erased (never params) to keep Executor covariant in TInput/TDeps/TState. */
export interface Executor<TInput = unknown, TDeps = unknown, TState = unknown> {
  readonly [EXECUTOR_BRAND]: true
  readonly __command: Command<TInput>
  readonly __fn: (command: never, context: never) => void | Promise<void>
  readonly __inputType?: TInput
  readonly __depsType?: TDeps
  readonly __stateType?: TState
}

/**
 * Create a CommandExecutor pair: [Command, Executor].
 *
 * Optionally provide a name as the first argument for devtools visibility.
 *
 * @example
 * ```ts
 * // With explicit name
 * const [SaveCmd, SaveExec] = CommandExecutor<
 *   { purchase: Purchase },
 *   { repo: PurchaseRepo },
 * >('SavePurchase', async (command, { deps, emit }) => {
 *   const result = await deps.repo.save(command.purchase)
 *   result.match(
 *     (saved) => emit(PurchaseEvent.saved({ purchase: saved })),
 *     (error) => emit(PurchaseEvent.saveFailed({ error })),
 *   )
 * })
 *
 * // Without name (fn.name used as fallback for named functions)
 * const [SaveCmd, SaveExec] = CommandExecutor<{ purchase: Purchase }>(
 *   async function SavePurchase(command, { emit }) => { ... }
 * )
 * ```
 */
export function CommandExecutor<
  TInput,
  TDeps = Record<string, never>,
  TState = unknown,
>(
  nameOrFn: string | ExecutorFn<TInput, TDeps, TState>,
  maybeFn?: ExecutorFn<TInput, TDeps, TState>,
): [Command<TInput>, Executor<TInput, TDeps, TState>] {
  const name = typeof nameOrFn === 'string' ? nameOrFn : (nameOrFn.name || undefined)
  const fn = typeof nameOrFn === 'string' ? maybeFn! : nameOrFn

  const commandId = Symbol('hurum/command-id')
  const command: Command<TInput> = {
    [COMMAND_BRAND]: commandId,
    ...(name ? { name } : {}),
  }
  const executor: Executor<TInput, TDeps, TState> = {
    [EXECUTOR_BRAND]: true,
    __command: command,
    __fn: fn as Executor['__fn'],
  }
  return [command, executor]
}

/** Check if a value is a Command */
export function isCommand(value: unknown): value is Command {
  return typeof value === 'object' && value !== null && COMMAND_BRAND in value
}

/** Check if a value is an Executor */
export function isExecutor(value: unknown): value is Executor {
  return typeof value === 'object' && value !== null && EXECUTOR_BRAND in value
}

/** Get the internal command symbol from a Command (for Store matching) */
export function getCommandId(command: Command): symbol {
  return command[COMMAND_BRAND]
}

/** Get the command from an executor */
export function getExecutorCommand(executor: Executor): Command {
  return executor.__command
}

/** Get the executor function (type-erased; callers cast as needed) */
export function getExecutorFn(executor: Executor): Executor['__fn'] {
  return executor.__fn
}
