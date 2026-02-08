import type { Todo } from '../entities/todo'

export interface TodoRepository {
  findAll(): Promise<Todo[]>
  save(todo: Todo): Promise<Todo>
  update(id: string, partial: Partial<Todo>): Promise<Todo>
  remove(id: string): Promise<void>
}
