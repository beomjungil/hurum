import type { Todo } from '../../domain/entities/todo'
import type { TodoRepository } from '../../domain/repository/todo.repository'

export class TodoRepositoryMemory implements TodoRepository {
  private items: Todo[] = []

  async findAll(): Promise<Todo[]> {
    return [...this.items]
  }

  async save(todo: Todo): Promise<Todo> {
    const index = this.items.findIndex((t) => t.id === todo.id)
    if (index >= 0) {
      this.items[index] = todo
    } else {
      this.items.push(todo)
    }
    return todo
  }

  async update(id: string, partial: Partial<Todo>): Promise<Todo> {
    const index = this.items.findIndex((t) => t.id === id)
    if (index < 0) throw new Error(`Todo not found: ${id}`)
    const updated: Todo = { ...this.items[index]!, ...partial, updatedAt: Date.now() }
    this.items[index] = updated
    return updated
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter((t) => t.id !== id)
  }
}
