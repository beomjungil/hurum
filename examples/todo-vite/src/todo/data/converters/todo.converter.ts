import { TodoSchema, type Todo } from '../../domain/entities/todo'

export function parseTodo(raw: unknown): Todo {
  return TodoSchema.parse(raw)
}

export function parseTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseTodo)
}
