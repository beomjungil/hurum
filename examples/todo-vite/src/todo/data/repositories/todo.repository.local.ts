import type { Todo } from '../../domain/entities/todo'
import type { TodoRepository } from '../../domain/repository/todo.repository'
import { parseTodos } from '../converters/todo.converter'

const STORAGE_KEY = 'hurum-todos'

export class TodoRepositoryLocal implements TodoRepository {
  async findAll(): Promise<Todo[]> {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return parseTodos(JSON.parse(raw))
  }

  async save(todo: Todo): Promise<Todo> {
    const all = await this.findAll()
    const index = all.findIndex((t) => t.id === todo.id)
    if (index >= 0) {
      all[index] = todo
    } else {
      all.push(todo)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    return todo
  }

  async update(id: string, partial: Partial<Todo>): Promise<Todo> {
    const all = await this.findAll()
    const index = all.findIndex((t) => t.id === id)
    if (index < 0) throw new Error(`Todo not found: ${id}`)
    const updated: Todo = { ...all[index]!, ...partial, updatedAt: Date.now() }
    all[index] = updated
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    return updated
  }

  async remove(id: string): Promise<void> {
    const all = await this.findAll()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter((t) => t.id !== id)))
  }
}
